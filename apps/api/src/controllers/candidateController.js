const { PrismaClient } = require('@prisma/client');
const githubService = require('../services/githubService');
const aiService = require('../services/aiService');

const prisma = new PrismaClient();

async function getMarketAverage(roleLabel = 'Senior Backend') {
    const row = await prisma.marketRate.findFirst({
        where: { roleLabel: { contains: roleLabel, mode: 'insensitive' } },
    });
    return row?.salaryAvgUsd ?? 8000;
}

exports.syncProfile = async (req, res) => {
    try {
        const { githubUsername, salaryDemand } = req.body;
        const userId = req.user.id;

        const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
        if (!profile) {
            return res.status(404).json({ message: 'Candidate profile not found' });
        }

        const marketAverage = await getMarketAverage(profile.primaryStack || 'Senior');
        const salary = salaryDemand != null ? parseFloat(salaryDemand) : (profile.salaryExpectationUsd || 7000);
        const githubData = await githubService.analyzeUserRepos(githubUsername || profile.githubUsername || '');
        const eScore = githubService.calculateEScore(githubData.efficiencyIndex, salary, marketAverage);
        const readinessScore = Math.min(100, Math.round((eScore + (githubData.efficiencyIndex || 0)) / 2));

        await prisma.candidateProfile.update({
            where: { userId },
            data: {
                githubUsername: (githubUsername || profile.githubUsername)?.trim() || profile.githubUsername,
                salaryExpectationUsd: salary,
                eScore,
                readinessScore,
            },
        });

        res.json({
            success: true,
            githubData,
            salaryDemand: salary,
            marketAverage,
            eScore,
            readinessScore,
            recommendation: eScore > 90 ? 'High Priority' : eScore >= 70 ? 'Qualified' : 'Needs improvement',
        });
    } catch (err) {
        console.error('syncProfile error:', err);
        res.status(500).json({ message: 'Error syncing profile' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const profile = await prisma.candidateProfile.findUnique({
            where: { userId: req.user.id },
            include: { user: { select: { fullName: true, email: true } } },
        });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        const out = { ...profile, fullName: profile.user?.fullName, email: profile.user?.email };
        delete out.user;
        res.json(out);
    } catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ message: 'Failed to load profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const profile = await prisma.candidateProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const allowed = ['githubUsername', 'linkedinUrl', 'primaryStack', 'experienceLevel', 'englishLevel', 'salaryExpectationUsd', 'taxResidence', 'taxId', 'cityState'];
        const data = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) data[k] = req.body[k] === '' ? null : req.body[k];
        }
        if (req.body.salaryExpectationUsd !== undefined) data.salaryExpectationUsd = req.body.salaryExpectationUsd ? parseInt(req.body.salaryExpectationUsd, 10) : null;

        await prisma.candidateProfile.update({
            where: { userId: req.user.id },
            data,
        });
        if (req.body.fullName !== undefined && req.body.fullName.trim()) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { fullName: req.body.fullName.trim() },
            });
        }
        const updated = await prisma.candidateProfile.findUnique({
            where: { userId: req.user.id },
        });
        res.json(updated);
    } catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

exports.interviewAssessment = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
        const level = profile?.experienceLevel || 'Senior';
        const role = profile?.primaryStack || 'Backend Engineer';
        const assessment = await aiService.assessSpeechProficiency(profile?.englishLevel || 'intermediate');
        const questions = aiService.generateInterviewQuestions(role, level);

        if (profile && assessment.overallScore != null) {
            await prisma.candidateProfile.update({
                where: { userId },
                data: { speechScore: assessment.overallScore },
            });
        }

        res.json({
            success: true,
            assessment,
            questions,
            nextStep: 'Complete System Design Quiz',
        });
    } catch (err) {
        console.error('interviewAssessment error:', err);
        res.status(500).json({ message: 'Error during AI assessment' });
    }
};
