const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { createAuthRateLimit } = require('../middleware/authRateLimit');
const { validateBody } = require('../middleware/validateBody');
const { registerSchema, loginSchema, verifyEmailSchema } = require('../validation/schemas');

const authAttemptLimit = createAuthRateLimit({ max: process.env.NODE_ENV === 'production' ? 10 : 100 });

router.post('/register', authAttemptLimit, validateBody(registerSchema), authController.register);
router.post('/login', authAttemptLimit, validateBody(loginSchema), authController.login);
router.post('/keycloak-callback', authController.keycloakCallback);
router.get('/me', auth, authController.getMe);
router.post('/logout', auth, authController.logout);
router.post('/verify-email', validateBody(verifyEmailSchema), authController.verifyEmail);

module.exports = router;
