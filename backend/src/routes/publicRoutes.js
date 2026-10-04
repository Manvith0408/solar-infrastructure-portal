const express = require('express');
const router = express.Router();
const {
  calculateAndSaveInquiry,
  createInquiry,
  submitFeedback,
  getVendors,
  contactVendorForInquiry,
  getMyInquiries,
  downloadPublicInquiryPdf
} = require('../controllers/publicController');
const { verifyFirebaseToken, optionalFirebaseToken } = require('../middleware/authMiddleware');

// POST /api/public/calculate (attaches userId if token provided)
router.post('/calculate', optionalFirebaseToken, calculateAndSaveInquiry);

// POST /api/public/inquiry (accepts calculator results, creates new document in PublicInquiry collection, returns 201)
router.post('/inquiry', optionalFirebaseToken, createInquiry);
router.post('/inquiries', optionalFirebaseToken, createInquiry);

// GET /api/public/my-inquiries (retrieves inquiries for authenticated citizen)
router.get('/my-inquiries', verifyFirebaseToken, getMyInquiries);

// GET /api/public/inquiry/:id/download-pdf (strictly protected by Firebase token)
router.get('/inquiry/:id/download-pdf', verifyFirebaseToken, downloadPublicInquiryPdf);
router.get('/inquiries/:id/download-pdf', verifyFirebaseToken, downloadPublicInquiryPdf);

// PATCH /api/public/feedback
router.patch('/feedback', submitFeedback);

// GET /api/public/vendors?pincode=123456
router.get('/vendors', getVendors);

// POST /api/public/inquiry/:id/contact
router.post('/inquiry/:id/contact', optionalFirebaseToken, contactVendorForInquiry);

module.exports = router;
