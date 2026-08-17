export function ConsentBadge({ consentRecorded }: { consentRecorded: boolean }) {
    return (
        <span
            aria-label={consentRecorded ? 'Client presentation consent recorded' : 'Client presentation consent required'}
            className={`inline-block rounded-full px-2 py-0.5 text-text ${consentRecorded ? 'bg-success' : 'bg-warning'}`}
        >
            {consentRecorded ? 'Consent recorded' : 'Private — consent required'}
        </span>
    );
}
