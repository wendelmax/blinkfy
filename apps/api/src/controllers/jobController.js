const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listJobs = async (req, res) => {
    try {
        const jobs = await prisma.job.findMany({
            where: { status: 'open' },
            include: { company: { select: { name: true } } },
            orderBy: { postedAt: 'desc' },
            take: 100,
        });
        res.json(jobs.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company.name,
            location: j.location,
            type: j.jobType,
            salary: j.salaryMinUsd && j.salaryMaxUsd
                ? `$${j.salaryMinUsd.toLocaleString()} - $${j.salaryMaxUsd.toLocaleString()} / month`
                : 'Competitive',
            stack: j.stack || [],
            postedAt: formatPostedAt(j.postedAt),
            description: j.description,
        })));
    } catch (err) {
        console.error('listJobs error:', err);
        res.status(500).json({ message: 'Failed to load jobs' });
    }
};

exports.createJob = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({ where: { userId: req.user.id } });
        if (!company) return res.status(403).json({ message: 'Company profile required' });

        const { title, description, location, jobType, salaryMinUsd, salaryMaxUsd, stack } = req.body;
        if (!title) return res.status(400).json({ message: 'Title is required' });

        const job = await prisma.job.create({
            data: {
                companyId: company.id,
                title: title.trim(),
                description: description?.trim() || null,
                location: location?.trim() || null,
                jobType: jobType || 'Contract',
                salaryMinUsd: salaryMinUsd != null ? parseInt(salaryMinUsd, 10) : null,
                salaryMaxUsd: salaryMaxUsd != null ? parseInt(salaryMaxUsd, 10) : null,
                stack: Array.isArray(stack) ? stack : (stack ? [stack] : []),
            },
        });
        res.status(201).json(job);
    } catch (err) {
        console.error('createJob error:', err);
        res.status(500).json({ message: 'Failed to create job' });
    }
};

exports.apply = async (req, res) => {
    try {
        const { jobId } = req.body;
        if (!jobId) return res.status(400).json({ message: 'jobId is required' });

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job || job.status !== 'open') return res.status(404).json({ message: 'Job not found or closed' });

        const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) return res.status(403).json({ message: 'Candidate profile required' });

        const existing = await prisma.application.findFirst({
            where: { jobId, candidateId: req.user.id },
        });
        if (existing) return res.status(400).json({ message: 'Already applied to this job' });

        const application = await prisma.application.create({
            data: {
                jobId,
                candidateId: req.user.id,
                eScoreAtApply: profile.eScore,
            },
        });
        res.status(201).json({ success: true, applicationId: application.id });
    } catch (err) {
        console.error('apply error:', err);
        res.status(500).json({ message: 'Failed to apply' });
    }
};

exports.getApplications = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({ where: { userId: req.user.id } });
        if (!company) return res.status(403).json({ message: 'Company profile required' });

        const applications = await prisma.application.findMany({
            where: { job: { companyId: company.id } },
            include: {
                job: { select: { title: true, id: true } },
                candidate: {
                    select: { fullName: true },
                    include: {
                        candidateProfile: {
                            select: { primaryStack: true, eScore: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        res.json(applications.map((a) => ({
            id: a.id,
            jobId: a.jobId,
            jobTitle: a.job.title,
            candidateName: a.candidate.fullName,
            role: a.candidate.candidateProfile?.primaryStack || 'Developer',
            eScore: a.eScoreAtApply ?? a.candidate.candidateProfile?.eScore ?? 0,
            stage: a.status,
            createdAt: a.createdAt.toISOString(),
        })));
    } catch (err) {
        console.error('getApplications error:', err);
        res.status(500).json({ message: 'Failed to load applications' });
    }
};

function formatPostedAt(date) {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / (60 * 60 * 1000));
    const day = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    if (day < 7) return `${day}d ago`;
    return d.toISOString().slice(0, 10);
}
