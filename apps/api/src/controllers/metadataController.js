const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getTechStacks = async (req, res) => {
    try {
        const list = await prisma.techStack.findMany({
            orderBy: { name: 'asc' },
            select: { name: true },
        });
        res.json(list.map((t) => t.name));
    } catch (err) {
        console.error('getTechStacks error:', err);
        res.status(500).json({ message: 'Failed to load tech stacks' });
    }
};
