const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leave.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 假期申請
router.post('/', authenticate, leaveController.createApplication);
router.get('/', authenticate, leaveController.getApplications);
router.get('/balances', authenticate, leaveController.getBalances);
router.get('/pending-approvals', authenticate, leaveController.getPendingApprovals);
router.get('/:id', authenticate, leaveController.getApplicationById);

// 文件上傳
router.post('/:id/documents', authenticate, upload.single('file'), leaveController.uploadDocument);
router.get('/:id/documents', authenticate, leaveController.getDocuments);

// 取消假期
router.post('/cancel', authenticate, leaveController.requestCancellation);

module.exports = router;
