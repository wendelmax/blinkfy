const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validateBody');
const { companyPatchSchema } = require('../validation/schemas');

router.get('/', auth, requireRole('recruiter', 'company'), companyController.getCompany);
router.patch('/', auth, requireRole('recruiter', 'company'), validateBody(companyPatchSchema), companyController.updateCompany);

module.exports = router;
