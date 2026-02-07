const githubService = require('../services/githubService');

exports.syncProfile = async (req, res) => {
    const { githubUsername, salaryDemand } = req.body;
    const marketAverage = 8000; // Mock average for Senior Dev

    try {
        const githubData = await githubService.analyzeUserRepos(githubUsername);
        const finalEScore = githubService.calculateEScore(
            githubData.efficiencyIndex,
            salaryDemand || 7000,
            marketAverage
        );

        res.json({
            success: true,
            githubData,
            salaryDemand,
            marketAverage,
            eScore: finalEScore,
            recommendation: finalEScore > 90 ? 'High Priority' : 'Qualified'
        });
    } catch (err) {
        res.status(500).json({ message: 'Error syncing profile' });
    }
};

const aiService = require('../services/aiService');

exports.interviewAssessment = async (req, res) => {
    try {
        const assessment = await aiService.assessSpeechProficiency(null); // Mocking audio input
        const questions = aiService.generateInterviewQuestions('Backend Engineer', 'Senior');

        res.json({
            success: true,
            assessment,
            questions,
            nextStep: 'Complete System Design Quiz'
        });
    } catch (err) {
        res.status(500).json({ message: 'Error during AI assessment' });
    }
};
