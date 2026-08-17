const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentEscrowController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validateBody');
const { escrowHoldSchema, invoiceCreateSchema, withdrawalSchema } = require('../validation/schemas');

router.get('/escrow/summary', auth, requireRole('candidate', 'recruiter', 'company'), ctrl.getEscrowSummary);
router.get('/escrow/holds', auth, requireRole('candidate', 'recruiter', 'company'), ctrl.listEscrowHolds);
router.post('/escrow/holds', auth, requireRole('recruiter', 'company', 'admin'), validateBody(escrowHoldSchema), ctrl.createEscrowHold);
router.post('/escrow/holds/:holdId/release', auth, requireRole('admin'), ctrl.releaseEscrowHold);
router.post('/escrow/holds/:holdId/forfeit', auth, requireRole('admin'), ctrl.forfeitEscrowHold);
router.post('/escrow/process-releases', auth, requireRole('admin'), ctrl.processReleases);

router.get('/invoices/summary', auth, requireRole('candidate', 'recruiter', 'company'), ctrl.getInvoiceSummary);
router.get('/invoices', auth, requireRole('candidate', 'recruiter', 'company'), ctrl.listInvoices);
router.post('/invoices', auth, requireRole('candidate', 'recruiter', 'company'), validateBody(invoiceCreateSchema), ctrl.createInvoice);
router.post('/invoices/:invoiceId/issue', auth, requireRole('candidate', 'recruiter', 'company'), ctrl.issueInvoice);
router.post('/invoices/:invoiceId/mark-paid', auth, requireRole('admin'), ctrl.markInvoicePaid);
router.post('/invoices/:invoiceId/void', auth, requireRole('admin'), ctrl.voidInvoice);

router.post('/withdraw', auth, requireRole('candidate', 'recruiter'), validateBody(withdrawalSchema), ctrl.requestWithdrawal);

router.get('/fees/pending', auth, requireRole('admin'), ctrl.listPendingFees);

module.exports = router;
