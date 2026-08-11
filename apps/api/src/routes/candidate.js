const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/profile', auth, requireRole('candidate'), candidateController.getProfile);
router.patch('/profile', auth, requireRole('candidate'), candidateController.updateProfile);
router.post('/sync-profile', auth, requireRole('candidate'), candidateController.syncProfile);
router.post('/interview-assessment', auth, requireRole('candidate'), candidateController.interviewAssessment);

module.exports = router;
