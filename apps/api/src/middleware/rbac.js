function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const role = req.user?.type;
        if (!role || !allowedRoles.includes(role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        return next();
    };
}

module.exports = { requireRole };
