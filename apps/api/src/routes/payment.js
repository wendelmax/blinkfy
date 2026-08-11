const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/wallet-summary', auth, requireRole('candidate', 'recruiter', 'company'), paymentController.getWalletSummary);
router.get('/recruiter-earnings', auth, requireRole('recruiter'), paymentController.getRecruiterEarnings);

module.exports = router;
