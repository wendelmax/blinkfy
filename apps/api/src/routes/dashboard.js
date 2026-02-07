const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.get('/metrics', auth, dashboardController.getMetrics);
router.get('/recruiter-tools', auth, dashboardController.getRecruiterTools);

module.exports = router;
