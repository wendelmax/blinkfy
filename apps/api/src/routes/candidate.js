const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const auth = require('../middleware/auth');

router.post('/sync-profile', auth, candidateController.syncProfile);
router.post('/interview-assessment', auth, candidateController.interviewAssessment);

module.exports = router;
