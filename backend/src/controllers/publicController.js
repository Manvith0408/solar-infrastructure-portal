const { PublicInquiryRepo, VendorRepo } = require('../models/store');
const { calculatePublicSystemSize } = require('../utils/solarConstants');
const { generatePersonalDPRPdf } = require('../utils/pdfGenerator');

/**
 * POST /api/public/calculate
 * Accepts bill/appliance data, runs sizing math, returns recommendations, and saves to PublicInquiry.
 */
async function calculateAndSaveInquiry(req, res) {
  try {
    const { meterNumber, consumptionData, consumerName, consumerPhone, city } = req.body;

    if (!consumptionData || !consumptionData.type || consumptionData.value === undefined) {
      return res.status(400).json({
        success: false,
        error: "Invalid payload: 'consumptionData' with 'type' ('BILL' | 'APPLIANCES') and 'value' is required."
      });
    }

    if (!['BILL', 'APPLIANCES'].includes(consumptionData.type)) {
      return res.status(400).json({
        success: false,
        error: "Consumption type must be either 'BILL' or 'APPLIANCES'."
      });
    }

    // Inherit meterNumber directly from the logged-in User profile, or fallback to body/generated
    const userMeter = req.mongoUser?.meterNumber || req.user?.meterNumber;
    const resolvedMeterNumber = userMeter && userMeter.trim().length > 0
      ? userMeter.trim().toUpperCase()
      : (meterNumber && meterNumber.trim().length > 0
          ? meterNumber.trim().toUpperCase()
          : `DL-MTR-${Date.now().toString().slice(-6)}`);

    // Run sizing calculations
    const mathResults = calculatePublicSystemSize(consumptionData);

    // Determine linked user ID if authenticated
    const linkedUserId = req.user?.uid || req.body.userId || null;

    // Save to isolated PublicInquiry collection (Schema A)
    // If the meterNumber already exists, update the inquiry with the latest sizing
    const inquiry = await PublicInquiryRepo.findOneAndUpdate(
      { meterNumber: resolvedMeterNumber },
      {
        meterNumber: resolvedMeterNumber,
        consumptionData,
        calculatedKw: mathResults.calculatedKw,
        calculatedCost: mathResults.grossCost,
        subsidyAmount: mathResults.subsidy,
        netCost: mathResults.netCost,
        batteryBackupKwh: mathResults.batteryBackupKwh,
        consumerName: consumerName || req.user?.name || 'Residential Consumer',
        consumerPhone: consumerPhone || '',
        city: city || 'New Delhi',
        ...(req.mongoUser?._id ? { user: req.mongoUser._id } : {}),
        ...(linkedUserId ? { userId: linkedUserId } : {})
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: {
        inquiryId: inquiry._id,
        meterNumber: inquiry.meterNumber,
        consumptionData: inquiry.consumptionData,
        calculatedKw: inquiry.calculatedKw,
        grossCost: inquiry.calculatedCost,
        subsidyAmount: inquiry.subsidyAmount,
        netCost: inquiry.netCost,
        batteryBackupKwh: inquiry.batteryBackupKwh,
        status: inquiry.status,
        feedbackRating: inquiry.feedbackRating,
        sizingDetails: {
          dailyKwh: mathResults.dailyKwh,
          monthlySavingsEst: Math.round(mathResults.dailyKwh * 30 * 8.5) // ~₹8.5/kWh average tariff
        }
      }
    });
  } catch (error) {
    console.error('Error in calculateAndSaveInquiry:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process solar calculation and inquiry.',
      details: error.message
    });
  }
}

/**
 * POST /api/public/inquiry
 * Accepts calculator results (calculatedKw, grossCost, subsidyAmount, user ID/meter number) in req.body,
 * creates a new document in the PublicInquiry MongoDB collection, and returns a 201 Success response.
 */
async function createInquiry(req, res) {
  try {
    const {
      calculatedKw,
      grossCost,
      calculatedCost,
      subsidyAmount,
      netCost,
      batteryBackupKwh,
      meterNumber,
      userId,
      consumerName,
      consumerPhone,
      city,
      consumptionData,
      status
    } = req.body;

    // Resolve numeric values
    const resolvedKw = Number(calculatedKw) || 0;
    const resolvedGrossCost = Number(grossCost ?? calculatedCost) || (resolvedKw > 0 ? Math.round(resolvedKw * 60000) : 0);
    const resolvedSubsidy = Number(subsidyAmount) || 0;
    const resolvedNetCost = (netCost !== undefined && netCost !== null && !isNaN(Number(netCost)))
      ? Number(netCost)
      : Math.max(0, resolvedGrossCost - resolvedSubsidy);
    const resolvedBattery = Number(batteryBackupKwh) || 0;

    // Inherit meterNumber directly from authenticated User profile, or fallback to body/generated
    const userMeter = req.mongoUser?.meterNumber || req.user?.meterNumber;
    const resolvedMeterNumber = (meterNumber && meterNumber.trim().length > 0)
      ? meterNumber.trim().toUpperCase()
      : (userMeter && userMeter.trim().length > 0
          ? userMeter.trim().toUpperCase()
          : `DL-MTR-${Date.now().toString().slice(-6)}`);

    // Determine linked user ID if authenticated
    const linkedUserId = req.user?.uid || userId || null;
    const linkedMongoUser = req.mongoUser?._id || null;

    // Fallback consumption data if not explicitly provided
    const resolvedConsumption = consumptionData && consumptionData.type
      ? consumptionData
      : { type: 'BILL', value: Math.round(resolvedKw * 120 || 300) };

    const inquiryData = {
      meterNumber: resolvedMeterNumber,
      consumptionData: resolvedConsumption,
      calculatedKw: resolvedKw,
      calculatedCost: resolvedGrossCost,
      subsidyAmount: resolvedSubsidy,
      netCost: resolvedNetCost,
      batteryBackupKwh: resolvedBattery,
      consumerName: consumerName || req.user?.name || req.mongoUser?.name || 'Residential Consumer',
      consumerPhone: consumerPhone || req.body.phone || '',
      userPhone: req.body.userPhone || consumerPhone || req.body.phone || '',
      city: city || 'New Delhi',
      status: status || 'Pending',
      ...(linkedMongoUser ? { user: linkedMongoUser } : {}),
      ...(linkedUserId ? { userId: linkedUserId } : {})
    };

    let inquiry;
    try {
      inquiry = await PublicInquiryRepo.create(inquiryData);
    } catch (createErr) {
      if (createErr.code === 11000) {
        inquiry = await PublicInquiryRepo.findOneAndUpdate(
          { meterNumber: resolvedMeterNumber },
          inquiryData,
          { new: true, upsert: true }
        );
      } else {
        throw createErr;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Inquiry created and persisted to database successfully.',
      data: {
        inquiryId: inquiry._id,
        _id: inquiry._id,
        meterNumber: inquiry.meterNumber,
        consumptionData: inquiry.consumptionData,
        calculatedKw: inquiry.calculatedKw,
        grossCost: inquiry.calculatedCost,
        calculatedCost: inquiry.calculatedCost,
        subsidyAmount: inquiry.subsidyAmount,
        netCost: inquiry.netCost,
        batteryBackupKwh: inquiry.batteryBackupKwh,
        status: inquiry.status,
        consumerName: inquiry.consumerName,
        consumerPhone: inquiry.consumerPhone,
        city: inquiry.city,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
        sizingDetails: {
          dailyKwh: Math.round(((inquiry.calculatedKw || 1) / 1.1) * 4 * 10) / 10,
          monthlySavingsEst: Math.round((inquiry.calculatedKw || 1) * 120 * 8.5)
        }
      },
      inquiryId: inquiry._id
    });
  } catch (error) {
    console.error('Error in createInquiry:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save inquiry to database.',
      details: error.message
    });
  }
}

/**
 * PATCH /api/public/feedback
 * Updates a specific inquiry with a 1-5 star rating.
 */
async function submitFeedback(req, res) {
  try {
    const { inquiryId, meterNumber, rating } = req.body;

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be an integer between 1 and 5.'
      });
    }

    const query = inquiryId ? { _id: inquiryId } : { meterNumber: meterNumber?.trim().toUpperCase() };
    if (!query._id && !query.meterNumber) {
      return res.status(400).json({
        success: false,
        error: 'Either inquiryId or meterNumber is required to submit feedback.'
      });
    }

    const updatedInquiry = await PublicInquiryRepo.findOneAndUpdate(
      query,
      { feedbackRating: Math.round(numericRating) },
      { new: true }
    );

    if (!updatedInquiry) {
      return res.status(404).json({
        success: false,
        error: 'Inquiry record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback rating saved successfully.',
      data: {
        inquiryId: updatedInquiry._id,
        meterNumber: updatedInquiry.meterNumber,
        feedbackRating: updatedInquiry.feedbackRating
      }
    });
  } catch (error) {
    console.error('Error in submitFeedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record feedback rating.',
      details: error.message
    });
  }
}

/**
 * GET /api/public/vendors?pincode=123456
 * Searches Vendor collection for vendors serving the requested pincode
 */
async function getVendors(req, res) {
  try {
    const { pincode } = req.query;

    const filter = {};
    if (pincode && pincode.trim().length > 0) {
      filter.servicePincodes = pincode.trim();
    }

    let vendors = await VendorRepo.find(filter).sort({ rating: -1 }).lean();

    // If a specific pincode yielded 0 exact matches, also include top national EPCs
    let fallbackUsed = false;
    if (vendors.length === 0 && pincode) {
      fallbackUsed = true;
      vendors = await VendorRepo.find({}).sort({ rating: -1 }).limit(3).lean();
    }

    return res.status(200).json({
      success: true,
      count: vendors.length,
      pincode: pincode || null,
      fallbackUsed,
      data: vendors
    });
  } catch (error) {
    console.error('Error in getVendors:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search vendors.',
      details: error.message
    });
  }
}

/**
 * POST /api/public/inquiry/:id/contact
 * Accepts userPhone and vendorId in the body.
 * Updates PublicInquiry document to mark vendorContacted: true and attaches selectedVendorId.
 */
async function contactVendorForInquiry(req, res) {
  try {
    const { id } = req.params;
    const { userPhone, vendorId } = req.body;

    if (!userPhone || typeof userPhone !== 'string' || userPhone.trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A valid WhatsApp / Phone number is required.'
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        error: 'Field "vendorId" is required.'
      });
    }

    // Verify vendor
    const vendor = await VendorRepo.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Selected vendor not found in registry.'
      });
    }

    // Find inquiry by _id or meterNumber
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { meterNumber: id.trim().toUpperCase() };

    const updatedInquiry = await PublicInquiryRepo.findOneAndUpdate(
      query,
      {
        vendorContacted: true,
        selectedVendorId: vendor._id,
        userPhone: userPhone.trim()
      },
      { new: true }
    );

    if (!updatedInquiry) {
      return res.status(404).json({
        success: false,
        error: 'Public inquiry record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Inquiry successfully forwarded to ${vendor.companyName}.`,
      data: {
        inquiryId: updatedInquiry._id,
        meterNumber: updatedInquiry.meterNumber,
        vendorContacted: updatedInquiry.vendorContacted,
        userPhone: updatedInquiry.userPhone,
        status: updatedInquiry.status,
        selectedVendor: {
          _id: vendor._id,
          companyName: vendor.companyName,
          phone: vendor.phone,
          contactEmail: vendor.contactEmail,
          rating: vendor.rating
        }
      }
    });
  } catch (error) {
    console.error('Error in contactVendorForInquiry:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to contact vendor.',
      details: error.message
    });
  }
}

/**
 * GET /api/public/my-inquiries
 * Retrieves past inquiries submitted by the authenticated citizen
 */
async function getMyInquiries(req, res) {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to view saved calculations.'
      });
    }

    const inquiries = await PublicInquiryRepo.find({ userId });
    return res.status(200).json({
      success: true,
      data: inquiries
    });
  } catch (error) {
    console.error('Error in getMyInquiries:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve inquiries.',
      details: error.message
    });
  }
}

/**
 * GET /api/public/inquiry/:id/download-pdf
 * Generates and streams Personal Solar Installation Report PDF
 */
async function downloadPublicInquiryPdf(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Inquiry ID is required.' });
    }

    let inquiry = null;
    try {
      inquiry = await PublicInquiryRepo.findById(id);
    } catch (_) {}
    if (!inquiry) {
      try {
        inquiry = await PublicInquiryRepo.findOne({ meterNumber: id.trim().toUpperCase() });
      } catch (_) {}
    }
    if (!inquiry) {
      return res.status(404).json({ success: false, error: 'Solar calculation inquiry not found.' });
    }

    // Security check: Verify user owns this inquiry or has ADMIN privileges
    const currentUserId = req.user?.uid;
    const currentUserMeter = req.mongoUser?.meterNumber || req.user?.meterNumber;
    const isAdmin = req.user?.role === 'ADMIN' || req.mongoUser?.role === 'ADMIN';

    if (!isAdmin) {
      const isOwner =
        (inquiry.userId && inquiry.userId === currentUserId) ||
        (currentUserMeter && inquiry.meterNumber && inquiry.meterNumber.toUpperCase() === currentUserMeter.toUpperCase());

      // If inquiry has an explicit userId belonging to another user and meter numbers mismatch, reject
      if (inquiry.userId && inquiry.userId !== currentUserId && !isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden. You are not authorized to download this report.'
        });
      }
    }

    // If inquiry was created before user signed in, link it to active user
    if (!inquiry.userId && currentUserId) {
      await PublicInquiryRepo.findByIdAndUpdate(id, { userId: currentUserId });
    }

    const userProfile = {
      name: inquiry.consumerName || req.mongoUser?.name || req.user?.name || req.user?.displayName || 'Citizen Applicant',
      meterNumber: inquiry.meterNumber || currentUserMeter || 'DL-MTR-UNKNOWN'
    };

    const pdfBuffer = await generatePersonalDPRPdf(inquiry, userProfile);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="My-Solar-Report.pdf"',
      'Content-Length': pdfBuffer.length
    });

    return res.end(pdfBuffer);
  } catch (error) {
    console.error('Error in downloadPublicInquiryPdf:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate personal solar report PDF.',
      details: error.message
    });
  }
}

module.exports = {
  calculateAndSaveInquiry,
  createInquiry,
  submitFeedback,
  getVendors,
  contactVendorForInquiry,
  getMyInquiries,
  downloadPublicInquiryPdf
};
