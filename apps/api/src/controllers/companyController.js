const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getCompany = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { userId: req.user.id },
        });
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json(company);
    } catch (err) {
        console.error('getCompany error:', err);
        res.status(500).json({ message: 'Failed to load company' });
    }
};

exports.updateCompany = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { userId: req.user.id },
        });
        if (!company) return res.status(404).json({ message: 'Company not found' });

        const allowed = ['name', 'website', 'size', 'roleTypes', 'hiringVolume'];
        const data = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) data[k] = req.body[k] === '' ? null : req.body[k];
        }

        const updated = await prisma.company.update({
            where: { userId: req.user.id },
            data,
        });
        res.json(updated);
    } catch (err) {
        console.error('updateCompany error:', err);
        res.status(500).json({ message: 'Failed to update company' });
    }
};
