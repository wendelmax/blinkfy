const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { createAuthRateLimit } = require('../middleware/authRateLimit');

const authAttemptLimit = createAuthRateLimit({ max: process.env.NODE_ENV === 'production' ? 10 : 100 });

router.post('/register', authAttemptLimit, authController.register);
router.post('/login', authAttemptLimit, authController.login);
router.post('/keycloak-callback', authController.keycloakCallback);
router.get('/me', auth, authController.getMe);
router.post('/logout', auth, authController.logout);
router.post('/verify-email', authController.verifyEmail);

module.exports = router;
