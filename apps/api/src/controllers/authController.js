const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { issueSession, hashToken } = require('../services/authSessionService');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function issueAuthToken(user) {
    if (!JWT_SECRET) throw new Error('JWT_SECRET is required');
    const duration = /^([0-9]+)([smhd])$/.exec(JWT_EXPIRES);
    const units = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    const expiresAt = new Date(Date.now() + (duration ? Number(duration[1]) * units[duration[2]] : 7 * 24 * 60 * 60 * 1000));
    return issueSession(
        prisma,
        user,
        (claims) => jwt.sign({ id: user.id, email: user.email, name: user.fullName, type: user.userType, ...claims }, JWT_SECRET, { expiresIn: JWT_EXPIRES }),
        expiresAt,
    );
}

async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.fullName,
        fullName: user.fullName,
        type: user.userType,
        emailVerified: user.emailVerified,
    };
}

/**
 * POST /api/auth/register
 * Body: { email, password, fullName, userType: 'candidate'|'recruiter'|'company', ...profile }
 * - candidate: githubUsername?, linkedinUrl?, primaryStack?, experienceLevel?, englishLevel?, salaryExpectationUsd?, taxResidence?, taxId?, cityState?
 * - recruiter|company: companyName, website?, size?, roleTypes?, hiringVolume?, companyType: 'agency'|'company'
 */
exports.register = async (req, res) => {
    try {
        const {
            email,
            password,
            fullName,
            userType,
            // candidate
            githubUsername,
            linkedinUrl,
            primaryStack,
            experienceLevel,
            englishLevel,
            salaryExpectationUsd,
            taxResidence,
            taxId,
            cityState,
            // company/recruiter
            companyName,
            website,
            size,
            roleTypes,
            hiringVolume,
            companyType,
        } = req.body;

        if (!email || !password || !fullName || !userType) {
            return res.status(400).json({ message: 'Email, password, fullName and userType are required' });
        }

        const allowedTypes = ['candidate', 'recruiter', 'company'];
        if (!allowedTypes.includes(userType)) {
            return res.status(400).json({ message: 'userType must be candidate, recruiter or company' });
        }

        const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
        if (existing) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        const passwordHash = await hashPassword(password);
        const emailLower = email.trim().toLowerCase();

        const user = await prisma.$transaction(async (tx) => {
            const u = await tx.user.create({
                data: {
                    email: emailLower,
                    passwordHash,
                    fullName: fullName.trim(),
                    userType,
                },
            });

            if (userType === 'candidate') {
                await tx.candidateProfile.create({
                    data: {
                        userId: u.id,
                        githubUsername: githubUsername?.trim() || null,
                        linkedinUrl: linkedinUrl?.trim() || null,
                        primaryStack: primaryStack || null,
                        experienceLevel: experienceLevel || null,
                        englishLevel: englishLevel || null,
                        salaryExpectationUsd: salaryExpectationUsd != null ? parseInt(salaryExpectationUsd, 10) : null,
                        taxResidence: taxResidence || null,
                        taxId: taxId?.trim() || null,
                        cityState: cityState?.trim() || null,
                    },
                });
            }

            if (userType === 'recruiter' || userType === 'company') {
                await tx.company.create({
                    data: {
                        userId: u.id,
                        name: (companyName || fullName).trim(),
                        website: website?.trim() || null,
                        size: size || null,
                        roleTypes: roleTypes || null,
                        hiringVolume: hiringVolume || null,
                        companyType: companyType || (userType === 'recruiter' ? 'agency' : 'company'),
                    },
                });
            }

            return u;
        });

        const token = crypto.randomBytes(32).toString('hex');
        await prisma.emailVerificationToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        }).catch(() => null);

        const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
        await emailService.sendVerificationEmail(user.email, user.fullName, verificationUrl);

        const jwtToken = await issueAuthToken(user);

        res.status(201).json({
            token: jwtToken,
            user: sanitizeUser(user),
            message: 'Account created. Check your email to verify your address.',
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Registration failed' });
    }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.passwordHash) {
            return res.status(401).json({ message: 'This account uses single sign-on. Please sign in with the provider.' });
        }
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = await issueAuthToken(user);

        res.json({
            token,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/auth/me - requires auth middleware
 */
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                candidateProfile: true,
                company: true,
            },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const out = sanitizeUser(user);
        if (user.candidateProfile) out.candidateProfile = user.candidateProfile;
        if (user.company) out.company = user.company;
        res.json(out);
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/auth/keycloak-callback
 * Body: { code, redirectUri, userType: 'candidate'|'recruiter'|'company' }
 * Exchanges Keycloak auth code for tokens, creates/finds User, returns our JWT
 */
exports.keycloakCallback = async (req, res) => {
    try {
        const { code, redirectUri, userType } = req.body;
        if (!code || !redirectUri) {
            return res.status(400).json({ message: 'code and redirectUri are required' });
        }

        const kcUrl = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
        const realm = process.env.KEYCLOAK_REALM || 'recruitment';
        const clientId = process.env.KEYCLOAK_CLIENT_ID || 'recruitment-web';
        const tokenUrl = `${kcUrl}/realms/${realm}/protocol/openid-connect/token`;

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
        });

        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('Keycloak token error:', err);
            return res.status(400).json({ message: 'Invalid or expired authorization code' });
        }

        const tokens = await tokenRes.json();
        const accessToken = tokens.access_token;

        const userInfoUrl = `${kcUrl}/realms/${realm}/protocol/openid-connect/userinfo`;
        const userInfoRes = await fetch(userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userInfoRes.ok) {
            return res.status(400).json({ message: 'Failed to get user info' });
        }
        const kcUser = await userInfoRes.json();
        const keycloakId = kcUser.sub;
        const email = (kcUser.email || '').trim().toLowerCase();
        const fullName = (kcUser.name || kcUser.preferred_username || email || 'User').trim();

        if (!email) {
            return res.status(400).json({ message: 'Email is required from identity provider' });
        }

        const resolvedType = ['candidate', 'recruiter', 'company'].includes(userType)
            ? userType
            : (kcUser.realm_access?.roles?.includes('recruiter') ? 'recruiter'
                : kcUser.realm_access?.roles?.includes('company') ? 'company'
                : 'candidate');

        let user = await prisma.user.findFirst({
            where: { OR: [{ keycloakId }, { email }] },
            include: { candidateProfile: true, company: true },
        });

        if (!user) {
            user = await prisma.$transaction(async (tx) => {
                const u = await tx.user.create({
                    data: {
                        email,
                        fullName,
                        userType: resolvedType,
                        keycloakId,
                        emailVerified: !!kcUser.email_verified,
                    },
                });
                if (resolvedType === 'candidate') {
                    await tx.candidateProfile.create({ data: { userId: u.id } });
                }
                if (resolvedType === 'recruiter' || resolvedType === 'company') {
                    await tx.company.create({
                        data: {
                            userId: u.id,
                            name: fullName,
                            companyType: resolvedType === 'recruiter' ? 'agency' : 'company',
                        },
                    });
                }
                return tx.user.findUnique({
                    where: { id: u.id },
                    include: { candidateProfile: true, company: true },
                });
            });
        } else if (!user.keycloakId) {
            await prisma.user.update({
                where: { id: user.id },
                data: { keycloakId },
            });
        }

        const jwtToken = await issueAuthToken(user);

        res.json({
            token: jwtToken,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error('Keycloak callback error:', err);
        res.status(500).json({ message: 'Authentication failed' });
    }
};

exports.logout = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token && req.user?.sid) {
            await prisma.session.deleteMany({ where: { id: req.user.sid, userId: req.user.id, tokenHash: hashToken(token) } });
        }
        res.json({ message: 'Logged out' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ message: 'Logout failed' });
    }
};

/**
 * POST /api/auth/verify-email
 * Body: { token }
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        const record = await prisma.emailVerificationToken.findUnique({
            where: { token },
        });
        if (!record || new Date() > record.expiresAt) {
            return res.status(400).json({ message: 'Invalid or expired verification link' });
        }

        await prisma.user.update({
            where: { id: record.userId },
            data: { emailVerified: true },
        });
        await prisma.emailVerificationToken.delete({ where: { id: record.id } });

        res.json({ message: 'Email verified successfully' });
    } catch (err) {
        console.error('Verify email error:', err);
        res.status(500).json({ message: 'Verification failed' });
    }
};
