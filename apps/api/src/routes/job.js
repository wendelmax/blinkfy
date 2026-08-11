const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validateBody');
const { jobCreateSchema, jobApplySchema } = require('../validation/schemas');

router.get('/list', jobController.listJobs);
router.get('/applications', auth, requireRole('recruiter', 'company'), jobController.getApplications);
router.post('/create', auth, requireRole('recruiter', 'company'), validateBody(jobCreateSchema), jobController.createJob);
router.post('/apply', auth, requireRole('candidate'), validateBody(jobApplySchema), jobController.apply);

module.exports = router;
