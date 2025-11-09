const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const { authenticate } = require('../middleware/auth');

// 取得待批核的申請
router.get('/pending', authenticate, approvalController.getPendingApprovals);

// 取得批核記錄
router.get('/history', authenticate, approvalController.getApprovalHistory);

// 批核申請
router.post('/:id/approve', authenticate, approvalController.approve);

module.exports = router;
