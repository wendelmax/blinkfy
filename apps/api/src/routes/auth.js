const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/keycloak-callback', authController.keycloakCallback);
router.get('/me', auth, authController.getMe);
router.post('/verify-email', authController.verifyEmail);

module.exports = router;
