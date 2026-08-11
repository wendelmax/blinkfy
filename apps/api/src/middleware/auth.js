const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { hashToken } = require('../services/authSessionService');

const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'Authentication is not configured' });
        }
        const decoded = jwt.verify(token, secret);
        if (decoded.sid) {
            const session = await prisma.session.findFirst({
                where: { id: decoded.sid, tokenHash: hashToken(token), userId: decoded.id, expiresAt: { gt: new Date() } },
            });
            if (!session) return res.status(401).json({ message: 'Session is no longer valid' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
