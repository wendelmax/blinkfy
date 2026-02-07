const express = require('express');
const router = express.Router();
const metadataController = require('../controllers/metadataController');

router.get('/tech-stacks', metadataController.getTechStacks);

module.exports = router;
