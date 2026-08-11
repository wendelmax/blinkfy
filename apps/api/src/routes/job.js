const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/list', jobController.listJobs);
router.get('/applications', auth, requireRole('recruiter', 'company'), jobController.getApplications);
router.post('/create', auth, requireRole('recruiter', 'company'), jobController.createJob);
router.post('/apply', auth, requireRole('candidate'), jobController.apply);

module.exports = router;
