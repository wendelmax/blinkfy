const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.get('/wallet-summary', auth, paymentController.getWalletSummary);
router.get('/recruiter-earnings', auth, paymentController.getRecruiterEarnings);

module.exports = router;
