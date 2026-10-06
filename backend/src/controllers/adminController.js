const { PublicInquiryRepo, OfficialAreaDPRRepo, UserRepo, PublicInquiryModel } = require('../models/store');
const { getIsInMemory } = require('../config/db');
const { calculateAreaDPR } = require('../utils/solarConstants');
const { generateOfficialDPRPdf } = require('../utils/pdfGenerator');
const { statsCache, invalidateLeadStatsCache } = require('../utils/cache');

/**
 * GET /api/admin/leads
 * Returns paginated, filterable list of PublicInquiry documents for the CRM.
 */
async function getLeads(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { meterNumber: searchRegex },
        { consumerName: searchRegex },
        { city: searchRegex },
        { userPhone: searchRegex }
      ];
    }

    // Check memory cache for lead stats aggregation
    let statsAgg = statsCache.get('lead_stats_agg');

    const dbPromises = [
      PublicInquiryRepo.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PublicInquiryRepo.countDocuments(filter)
    ];

    if (!statsAgg) {
      dbPromises.push(
        PublicInquiryRepo.aggregate([
          {
            $group: {
              _id: null,
              totalDemandedKw: { $sum: '$calculatedKw' },
              totalDemandedCost: { $sum: '$calculatedCost' },
              avgRating: { $avg: '$feedbackRating' },
              totalLeads: { $sum: 1 },
              pendingCount: {
                $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
              },
              approvedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] }
              },
              commissionedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'COMMISSIONED'] }, 1, 0] }
              }
            }
          }
        ])
      );
    }

    const [leads, totalCount, freshAgg] = await Promise.all(dbPromises);

    if (!statsAgg && freshAgg) {
      statsAgg = freshAgg;
      statsCache.set('lead_stats_agg', statsAgg);
    }

    const stats = statsAgg[0] || {
      totalDemandedKw: 0,
      totalDemandedCost: 0,
      avgRating: 0,
      totalLeads: 0,
      pendingCount: 0,
      approvedCount: 0,
      commissionedCount: 0
    };

    return res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1
      },
      stats: {
        totalLeads: stats.totalLeads,
        totalDemandedKw: Math.round((stats.totalDemandedKw || 0) * 10) / 10,
        totalDemandedCost: stats.totalDemandedCost || 0,
        avgRating: stats.avgRating ? Math.round(stats.avgRating * 10) / 10 : 0,
        byStatus: {
          PENDING: stats.pendingCount || 0,
          APPROVED: stats.approvedCount || 0,
          COMMISSIONED: stats.commissionedCount || 0
        }
      }
    });
  } catch (error) {
    console.error('Error in getLeads:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve CRM leads.',
      details: error.message
    });
  }
}

/**
 * GET /api/admin/inquiries
 * Returns all public inquiries sorted by createdAt: -1 with populated user { name, meterNumber }
 */
async function getInquiries(req, res) {
  try {
    let inquiries;
    if (!getIsInMemory()) {
      inquiries = await PublicInquiryModel.find()
        .sort({ createdAt: -1 })
        .populate('user', 'name email meterNumber')
        .populate('selectedVendorId', 'companyName phone contactEmail rating')
        .lean();
    } else {
      inquiries = await PublicInquiryRepo.find()
        .sort({ createdAt: -1 })
        .lean();
    }

    // Ensure user object and required fields are cleanly populated on every inquiry
    const enriched = await Promise.all(
      inquiries.map(async (inq) => {
        let userObj = inq.user;
        let matchedUser = null;
        if (!userObj || !userObj.name || !userObj.email) {
          if (inq.meterNumber) {
            matchedUser = await UserRepo.findOne({ meterNumber: inq.meterNumber });
          }
          if (!matchedUser && inq.userId) {
            matchedUser = await UserRepo.findOne({ firebaseUid: inq.userId });
          }
          const defaultEmail = inq.consumerName
            ? `${inq.consumerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`
            : 'citizen@example.com';
          userObj = {
            name: userObj?.name || matchedUser?.name || inq.consumerName || 'Citizen User',
            email: userObj?.email || matchedUser?.email || inq.userEmail || inq.consumerEmail || defaultEmail,
            meterNumber: userObj?.meterNumber || matchedUser?.meterNumber || inq.meterNumber || ''
          };
        }

        // Format status to standard display if needed, but preserve 'Pending'
        let status = inq.status || 'Pending';
        if (status === 'PENDING') status = 'Pending';
        else if (status === 'APPROVED') status = 'Approved';
        else if (status === 'COMMISSIONED') status = 'Commissioned';

        const grossCost = inq.grossCost ?? inq.calculatedCost ?? 0;
        const subsidyAmount = inq.subsidyAmount ?? 0;
        const netCost = inq.netCost ?? (grossCost - subsidyAmount);

        return {
          ...inq,
          name: userObj.name,
          email: userObj.email,
          user: userObj,
          grossCost,
          calculatedCost: grossCost,
          subsidyAmount,
          netCost,
          status
        };
      })
    );

    return res.status(200).json(enriched);
  } catch (error) {
    console.error('Error in getInquiries:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve public inquiries.',
      details: error.message
    });
  }
}

/**
 * PATCH /api/admin/leads/:id/status or /api/admin/inquiries/:id/status
 * Updates the CRM status of a public inquiry.
 */
async function updateLeadStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus = status ? status.toUpperCase() : '';
    const validStatuses = ['PENDING', 'APPROVED', 'COMMISSIONED'];
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: PENDING, APPROVED, COMMISSIONED (or Pending, Approved, Commissioned)`
      });
    }

    const statusToSave = (status === 'Pending' || status === 'Approved' || status === 'Commissioned')
      ? status
      : normalizedStatus;

    const lead = await PublicInquiryRepo.findByIdAndUpdate(
      id,
      { status: statusToSave },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Inquiry not found.'
      });
    }

    // Invalidate lead stats aggregation cache upon status update
    invalidateLeadStatsCache();

    return res.status(200).json({
      success: true,
      message: `Inquiry status updated to ${statusToSave}.`,
      data: lead
    });
  } catch (error) {
    console.error('Error in updateLeadStatus:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update inquiry status.',
      details: error.message
    });
  }
}

/**
 * POST /api/admin/dpr/generate
 * Accepts bulk cohort data, runs microgrid and land constraint math,
 * saves to OfficialAreaDPR (Schema B), and returns the downloadable PDF buffer.
 */
async function generateAreaDPR(req, res) {
  try {
    const { areaName, availableLandAcres, distanceToSubstation, cohortData, returnJson } = req.body;

    if (!areaName || typeof areaName !== 'string' || areaName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Field 'areaName' is required."
      });
    }

    const parsedLand = Number(availableLandAcres);
    if (isNaN(parsedLand) || parsedLand < 0) {
      return res.status(400).json({
        success: false,
        error: "Field 'availableLandAcres' must be a non-negative number."
      });
    }

    const parsedDistance = Number(distanceToSubstation || 0);

    // Validate cohorts array
    if (!cohortData || !Array.isArray(cohortData) || cohortData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one cohort in 'cohortData' is required."
      });
    }

    // Run Microgrid, Land Constraint & Loss Math
    const dprCalc = calculateAreaDPR(cohortData, parsedLand, parsedDistance);

    // Save to isolated OfficialAreaDPR collection (Schema B)
    const savedDPR = await OfficialAreaDPRRepo.create({
      areaName: areaName.trim(),
      availableLandAcres: parsedLand,
      distanceToSubstation: parsedDistance,
      cohortData: cohortData,
      totalRequiredKw: dprCalc.totalRequiredKw,
      totalEstimatedBudget: dprCalc.totalEstimatedBudget,
      landFeasible: dprCalc.landFeasible,
      totalHouses: dprCalc.totalHouses,
      totalDailyKwh: dprCalc.totalDailyKwh,
      requiredLandAcres: dprCalc.requiredLandAcres,
      solarBudget: dprCalc.solarBudget,
      transmissionLineCost: dprCalc.transmissionLineCost
    });

    // If caller explicitly requested JSON preview (or query parameter format=json)
    if (returnJson === true || req.query.format === 'json') {
      return res.status(201).json({
        success: true,
        data: savedDPR,
        calculationDetails: dprCalc
      });
    }

    // Generate Official Government PDF Buffer
    const pdfBuffer = await generateOfficialDPRPdf(savedDPR);

    const safeFilename = `DPR_${areaName.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_${savedDPR.dprNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-DPR-Number', savedDPR.dprNumber);
    res.setHeader('X-DPR-Feasible', savedDPR.landFeasible ? 'true' : 'false');

    return res.end(pdfBuffer);
  } catch (error) {
    console.error('Error in generateAreaDPR:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate Area DPR.',
      details: error.message
    });
  }
}

/**
 * GET /api/admin/dpr
 * Retrieves list of past generated Area DPRs
 */
async function getDPRList(req, res) {
  try {
    const list = await OfficialAreaDPRRepo.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return res.status(200).json({
      success: true,
      data: list
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to list DPR records.'
    });
  }
}

/**
 * GET /api/admin/dpr/:id/download
 * Re-downloads PDF for a saved DPR
 */
async function downloadDPRPdf(req, res) {
  try {
    const { id } = req.params;
    const dpr = await OfficialAreaDPRRepo.findById(id);
    if (!dpr) {
      return res.status(404).json({ success: false, error: 'DPR record not found' });
    }

    const pdfBuffer = await generateOfficialDPRPdf(dpr);
    const safeFilename = `DPR_${dpr.areaName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dpr.dprNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/admin/leads/export
 * Exports CRM PublicInquiry leads as a downloadable CSV.
 */
async function exportLeadsCsv(req, res) {
  try {
    const { status, search } = req.query;

    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { meterNumber: searchRegex },
        { consumerName: searchRegex },
        { city: searchRegex },
        { userPhone: searchRegex }
      ];
    }

    const leads = await PublicInquiryRepo.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Inquiry ID',
      'Date',
      'Meter Number',
      'Consumer Name',
      'Phone',
      'City',
      'Calculated kW',
      'Gross Cost (INR)',
      'Subsidy Amount (INR)',
      'Net Cost (INR)',
      'Status',
      'Feedback Rating'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((l) => {
      const gross = l.grossCost ?? l.calculatedCost ?? 0;
      const subsidy = l.subsidyAmount ?? 0;
      const net = l.netCost ?? (gross - subsidy);
      const dateStr = l.createdAt ? new Date(l.createdAt).toISOString().replace('T', ' ').slice(0, 19) : '';
      return [
        escapeCsv(l._id || l.id),
        escapeCsv(dateStr),
        escapeCsv(l.meterNumber || ''),
        escapeCsv(l.consumerName || l.name || ''),
        escapeCsv(l.userPhone || l.phone || ''),
        escapeCsv(l.city || ''),
        escapeCsv(l.calculatedKw || 0),
        escapeCsv(gross),
        escapeCsv(subsidy),
        escapeCsv(net),
        escapeCsv(l.status || 'PENDING'),
        escapeCsv(l.feedbackRating ?? '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const filename = `crm-leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error in exportLeadsCsv:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to export CRM leads to CSV.',
      details: error.message
    });
  }
}

module.exports = {
  getInquiries,
  getLeads,
  updateLeadStatus,
  generateAreaDPR,
  getDPRList,
  downloadDPRPdf,
  exportLeadsCsv
};
