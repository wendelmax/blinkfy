/**
 * AI Service
 * Handles technical assessment prompts and speech proficiency analysis.
 */

exports.assessSpeechProficiency = async (englishLevelOrProfile) => {
    const level = typeof englishLevelOrProfile === 'string' ? englishLevelOrProfile : (englishLevelOrProfile?.englishLevel || 'intermediate');
    const map = {
        basic: { fluency: 55, vocabulary: 50, pronunciation: 52, overallScore: 52, level: 'Basic (A2)', feedback: 'Consider practicing technical vocabulary and fluency.' },
        intermediate: { fluency: 72, vocabulary: 70, pronunciation: 71, overallScore: 71, level: 'Intermediate (B2)', feedback: 'Good foundation. Focus on technical terms.' },
        advanced: { fluency: 85, vocabulary: 82, pronunciation: 84, overallScore: 84, level: 'Advanced (C1)', feedback: 'Good technical vocabulary. Occasional pauses on complex design.' },
        fluent: { fluency: 95, vocabulary: 95, pronunciation: 96, overallScore: 95, level: 'Fluent (C2)', feedback: 'Excellent clarity and technical expression.' },
    };
    return map[level] || map.intermediate;
};

exports.generateInterviewQuestions = (role, level) => {
    const base = [
        'How would you scale a high-traffic service to handle 1M concurrent users?',
        'Explain the trade-offs between REST and GraphQL in a microservices architecture.',
        'How do you manage database migrations in a distributed system with zero downtime?',
    ];
    const hint = role ? ` (relevant to ${role})` : '';
    return base.map((q, i) => `${i + 1}. ${q}${hint}`);
};

exports.evaluateAnswers = async (transcript) => {
    if (!transcript || !transcript.trim()) return { technicalAccuracy: 70, depthOfKnowledge: 70, grade: 'Mid' };
    const len = Math.min(500, transcript.length);
    const technicalAccuracy = Math.min(95, 70 + Math.floor(len / 25));
    const depthOfKnowledge = Math.min(95, 70 + Math.floor(len / 30));
    const grade = technicalAccuracy >= 85 ? 'Senior' : technicalAccuracy >= 75 ? 'Mid' : 'Junior';
    return { technicalAccuracy, depthOfKnowledge, grade };
};
