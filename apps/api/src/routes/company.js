const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/', auth, requireRole('recruiter', 'company'), companyController.getCompany);
router.patch('/', auth, requireRole('recruiter', 'company'), companyController.updateCompany);

module.exports = router;
