import type { FitScore } from '../../lib/types';

export function FitScoreCard({ score }: { score: FitScore }) {
    const displayedScore = score.overrideScore ?? score.score;
    const evidence = score.factors.flatMap((factor) => factor.evidence).filter(Boolean).slice(0, 2);

    return (
        <section aria-label="Fit score" className="border border-border rounded-lg p-3">
            <strong>{displayedScore}/100</strong>
            <p className="my-1.5">{score.confidence[0].toUpperCase() + score.confidence.slice(1)} confidence</p>
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
