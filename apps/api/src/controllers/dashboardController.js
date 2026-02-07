exports.getMetrics = async (req, res) => {
    // Mock metrics based on user type
    if (req.user.type === 'recruiter') {
        return res.json({
            commissions: 12450,
            pendingEscrow: 2400,
            activeCandidates: 24,
            roi: 4.2
        });
    }

    res.json({
        readiness: 85,
        matches: 12,
        eScore: 42,
        currencyRate: 5.42
    });
};

exports.getRecruiterTools = async (req, res) => {
    res.json({
        campaigns: [
            { id: 'ELX-99', title: 'Senior Elixir | Europe Referral', referralId: 'ELX-99' },
            { id: 'LAT-01', title: 'General Sourcing | LATAM', referralId: 'LAT-01' }
        ],
        topCandidates: [
            { name: 'Eduardo Silva', role: 'Go / K8s Expert', eScore: 94, roi: 'High' },
            { name: 'Mariana Costa', role: 'Next.js / TS Specialist', eScore: 89, roi: 'Med' }
        ]
    });
};
