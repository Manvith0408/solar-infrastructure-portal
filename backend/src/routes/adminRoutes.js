const express = require('express');
const router = express.Router();
const {
  getInquiries,
  getLeads,
  updateLeadStatus,
  generateAreaDPR,
  getDPRList,
  downloadDPRPdf
} = require('../controllers/adminController');
const { verifyFirebaseToken, requireRole } = require('../middleware/authMiddleware');

// Protect all admin endpoints with Firebase Admin Auth and RBAC
router.use(verifyFirebaseToken, requireRole('ADMIN'));

// GET /api/admin/inquiries (Live MongoDB Public Inquiries with populated user)
router.get('/inquiries', getInquiries);

// PATCH /api/admin/inquiries/:id/status
router.patch('/inquiries/:id/status', updateLeadStatus);

// GET /api/admin/leads
router.get('/leads', getLeads);

// PATCH /api/admin/leads/:id/status
router.patch('/leads/:id/status', updateLeadStatus);

// POST /api/admin/dpr/generate
router.post('/dpr/generate', generateAreaDPR);

// GET /api/admin/dpr (list)
router.get('/dpr', getDPRList);

// GET /api/admin/dpr/:id/download
router.get('/dpr/:id/download', downloadDPRPdf);

module.exports = router;
