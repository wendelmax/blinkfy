const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock user for testing
const MOCK_USER = {
    id: 'user_123',
    email: 'dev@aureus.com',
    passwordHash: '$2a$10$wR.bY.J7G7.G7.G7.G7.G.G7.G7.G7.G7.G7.G7.G7.G7.G7.G7', // test
    name: 'John Doe',
    type: 'candidate'
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // In a real app, find user in DB
        if (email !== MOCK_USER.email) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // For testing, accept "password"
        if (password !== 'password') {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = {
            id: MOCK_USER.id,
            email: MOCK_USER.email,
            name: MOCK_USER.name,
            type: MOCK_USER.type
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'development_secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: payload
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    res.json(req.user);
};
