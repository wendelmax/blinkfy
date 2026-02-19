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
