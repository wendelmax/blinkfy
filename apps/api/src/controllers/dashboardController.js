const { PrismaClient } = require('@prisma/client');
const paymentService = require('../services/paymentService');

const prisma = new PrismaClient();

exports.getMetrics = async (req, res) => {
    try {
        const userType = req.user.type;

        if (userType === 'recruiter' || userType === 'company') {
            const company = await prisma.company.findUnique({ where: { userId: req.user.id } });
            const companyId = company?.id;
            const jobsCount = companyId
                ? await prisma.job.count({ where: { companyId, status: 'open' } })
                : 0;
            const earnings = await paymentService.getRecruiterEarnings(req.user.id);
            const applicationsCount = companyId
                ? await prisma.application.count({
                    where: { job: { companyId }, status: { in: ['applied', 'shortlisted'] } },
                })
                : 0;
            return res.json({
                commissions: earnings.totalEarned,
                pendingEscrow: earnings.pendingRetention,
                activeCandidates: applicationsCount,
                openJobs: jobsCount,
                roi: jobsCount > 0 ? Math.round((earnings.totalEarned / jobsCount) * 10) / 10 : 0,
            });
        }

        const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user.id } });
        const applicationsCount = await prisma.application.count({ where: { candidateId: req.user.id } });
        const matchesCount = await prisma.job.count({ where: { status: 'open' } });
        const rate = await paymentService.getExchangeRate();

        res.json({
            readiness: profile?.readinessScore ?? 0,
            matches: matchesCount,
            eScore: profile?.eScore ?? 0,
            applications: applicationsCount,
            currencyRate: rate,
        });
    } catch (err) {
        console.error('getMetrics error:', err);
        res.status(500).json({ message: 'Failed to load metrics' });
    }
};

exports.getRecruiterTools = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({ where: { userId: req.user.id } });
        const companyId = company?.id || null;
        const jobs = companyId
            ? await prisma.job.findMany({
                where: { companyId },
                take: 20,
                orderBy: { postedAt: 'desc' },
            })
            : [];
        const campaigns = jobs.map((j) => ({
            id: j.id,
            title: j.title,
            referralId: j.id.slice(0, 8),
        }));

        const topCandidates = await prisma.candidateProfile.findMany({
            take: 10,
            where: { eScore: { not: null } },
            orderBy: { eScore: 'desc' },
            include: { user: { select: { fullName: true } } },
        });

        res.json({
            campaigns,
            topCandidates: topCandidates.map((c) => ({
                name: c.user.fullName,
                role: c.primaryStack || 'Developer',
                eScore: c.eScore ?? 0,
                roi: (c.eScore ?? 0) >= 90 ? 'High' : (c.eScore ?? 0) >= 75 ? 'Med' : 'Standard',
            })),
        });
    } catch (err) {
        console.error('getRecruiterTools error:', err);
        res.status(500).json({ message: 'Failed to load recruiter tools' });
    }
};
