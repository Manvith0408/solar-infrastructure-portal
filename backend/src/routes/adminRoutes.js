const express = require('express');
const router = express.Router();
const {
  getInquiries,
  getLeads,
  updateLeadStatus,
  generateAreaDPR,
  getDPRList,
  downloadDPRPdf,
  exportLeadsCsv
} = require('../controllers/adminController');
const { verifyFirebaseToken, requireRole } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

// Protect all admin endpoints with Firebase Admin Auth and RBAC
router.use(verifyFirebaseToken, requireRole('ADMIN'));

// GET /api/admin/leads/export (CRM CSV Export)
router.get('/leads/export', asyncHandler(exportLeadsCsv));

// GET /api/admin/inquiries (Live MongoDB Public Inquiries with populated user)
router.get('/inquiries', asyncHandler(getInquiries));

// PATCH /api/admin/inquiries/:id/status
router.patch('/inquiries/:id/status', asyncHandler(updateLeadStatus));

// GET /api/admin/leads
router.get('/leads', asyncHandler(getLeads));

// PATCH /api/admin/leads/:id/status
router.patch('/leads/:id/status', asyncHandler(updateLeadStatus));

// POST /api/admin/dpr/generate
router.post('/dpr/generate', asyncHandler(generateAreaDPR));

// GET /api/admin/dpr (list)
router.get('/dpr', asyncHandler(getDPRList));

// GET /api/admin/dpr/:id/download
router.get('/dpr/:id/download', asyncHandler(downloadDPRPdf));

module.exports = router;

