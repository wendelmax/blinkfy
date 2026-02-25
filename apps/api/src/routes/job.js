const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');

router.get('/list', jobController.listJobs);
router.get('/applications', auth, jobController.getApplications);
router.post('/create', auth, jobController.createJob);
router.post('/apply', auth, jobController.apply);

module.exports = router;
