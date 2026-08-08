import type { FitScore } from '../../lib/types';

export function FitScoreCard({ score }: { score: FitScore }) {
    const displayedScore = score.overrideScore ?? score.score;
    const evidence = score.factors.flatMap((factor) => factor.evidence).filter(Boolean).slice(0, 2);

    return (
        <section aria-label="Fit score" style={{ border: '1px solid #d7dce5', borderRadius: 8, padding: 12 }}>
            <strong>{displayedScore}/100</strong>
            <p style={{ margin: '6px 0' }}>{score.confidence[0].toUpperCase() + score.confidence.slice(1)} confidence</p>
            {score.overrideReason && <p>Reviewer override: {score.overrideReason}</p>}
            <div>
                <strong>Evidence</strong>
                {evidence.length > 0 ? <ul>{evidence.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No supporting evidence recorded.</p>}
            </div>
            <div>
                <strong>Gaps</strong>
                {score.gaps.length > 0 ? <ul>{score.gaps.slice(0, 2).map((gap) => <li key={gap}>{gap}</li>)}</ul> : <p>No material gaps recorded.</p>}
            </div>
        </section>
    );
}
