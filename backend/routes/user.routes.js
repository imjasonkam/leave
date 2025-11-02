const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, isDeptHead } = require('../middleware/auth');

router.get('/profile', authenticate, userController.getProfile);
router.get('/department', authenticate, isDeptHead, userController.getDepartmentUsers);

module.exports = router;
