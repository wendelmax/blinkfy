function normalizeEmail(value) {
    if (value == null || String(value).trim() === '') {
        return null;
    }
    return String(value).trim().toLowerCase();
}

function normalizeLinkedinUrl(value) {
    if (value == null || String(value).trim() === '') {
        return null;
    }

    const url = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(url.protocol) || !/(^|\.)linkedin\.com$/i.test(url.hostname)) {
        throw new TypeError('linkedinUrl must be a LinkedIn URL');
    }
    url.protocol = 'https:';
    url.hostname = url.hostname.toLowerCase();
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
}

async function findCandidateDuplicate({ prisma, workspaceId, email, linkedinUrl }) {
    const normalizedEmail = normalizeEmail(email);
    let normalizedLinkedinUrl = null;
    try {
        normalizedLinkedinUrl = normalizeLinkedinUrl(linkedinUrl);
    } catch {
        return null;
    }

    const matches = [];
    if (normalizedEmail) {
        matches.push({ normalizedEmail });
    }
    if (normalizedLinkedinUrl) {
        matches.push({ normalizedLinkedinUrl });
    }
    if (matches.length === 0) {
        return null;
    }

    return prisma.candidate.findFirst({
        where: { workspaceId, OR: matches },
        orderBy: { createdAt: 'asc' },
    });
}

async function findWorkspaceCandidate({ prisma, workspaceId, candidateId }) {
    return prisma.candidate.findFirst({ where: { id: candidateId, workspaceId } });
}

function hasActivePresentationConsent(consents, clientId) {
    return consents.some((consent) => consent.purpose === 'client_presentation'
        && consent.revokedAt === null
        && (consent.clientId === null || consent.clientId === clientId));
}

module.exports = {
    findCandidateDuplicate,
    findWorkspaceCandidate,
    hasActivePresentationConsent,
    normalizeEmail,
    normalizeLinkedinUrl,
};
