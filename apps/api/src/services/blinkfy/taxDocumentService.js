const { PrismaClient } = require('@prisma/client');

let prisma = new PrismaClient();
function setPrisma(client) { prisma = client; }

const W8BEN_VALIDITY_YEARS = 3;
const RENEWAL_ALERT_DAYS_BEFORE = 30;

async function getActiveDocuments(userId) {
    return prisma.taxDocument.findMany({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
    });
}

async function getDocumentById(userId, documentId) {
    const doc = await prisma.taxDocument.findFirst({
        where: { id: documentId, userId },
    });
    if (!doc) throw Object.assign(new Error('Tax document not found'), { status: 404 });
    return doc;
}

async function listDocuments(userId, { formType, status } = {}) {
    const where = { userId };
    if (formType) where.formType = formType;
    if (status) where.status = status;
    return prisma.taxDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
}

async function createDocument(userId, data) {
    const required = ['fullName'];
    for (const field of required) {
        if (!data[field]) throw Object.assign(new Error(`Missing required field: ${field}`), { status: 422 });
    }

    const formType = data.formType || 'w8ben';
    const signatureDate = data.signatureDate ? new Date(data.signatureDate) : new Date();
    const expiryDate = new Date(signatureDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + W8BEN_VALIDITY_YEARS);

    return prisma.taxDocument.create({
        data: {
            userId,
            documentType: formType === 'w8ben' ? 'w8ben' : formType === 'w9' ? 'w9' : 'other',
            formType,
            status: 'active',
            fullName: data.fullName,
            countryOfBirth: data.countryOfBirth || null,
            permanentAddress: data.permanentAddress || null,
            mailingAddress: data.mailingAddress || null,
            taxId: data.taxId || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            isForeignIndividual: data.isForeignIndividual !== false,
            claimTreatyBenefits: data.claimTreatyBenefits || false,
            treatyCountry: data.treatyCountry || null,
            treatyArticle: data.treatyArticle || null,
            documentUri: data.documentUri || null,
            signatureDate,
            expiryDate,
            metadata: data.metadata || undefined,
        },
    });
}

async function updateDocument(userId, documentId, data) {
    const existing = await getDocumentById(userId, documentId);
    if (existing.status === 'superseded') {
        throw Object.assign(new Error('Cannot modify a superseded document'), { status: 422 });
    }

    const allowed = ['fullName', 'countryOfBirth', 'permanentAddress', 'mailingAddress',
        'taxId', 'dateOfBirth', 'isForeignIndividual', 'claimTreatyBenefits',
        'treatyCountry', 'treatyArticle', 'documentUri', 'metadata'];
    const updateData = {};
    for (const key of allowed) {
        if (data[key] !== undefined) {
            updateData[key] = key === 'dateOfBirth' && data[key] ? new Date(data[key]) : data[key];
        }
    }

    return prisma.taxDocument.update({
        where: { id: documentId },
        data: updateData,
    });
}

async function supersedeDocument(userId, documentId, newData) {
    const existing = await getDocumentById(userId, documentId);

    const created = await createDocument(userId, {
        ...newData,
        formType: newData.formType || existing.formType,
    });

    await prisma.taxDocument.update({
        where: { id: documentId },
        data: { status: 'superseded', supersededById: created.id },
    });

    return created;
}

async function markExpired(documentId) {
    return prisma.taxDocument.update({
        where: { id: documentId },
        data: { status: 'expired' },
    });
}

async function getExpiringDocuments(daysBefore = RENEWAL_ALERT_DAYS_BEFORE) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysBefore);

    return prisma.taxDocument.findMany({
        where: {
            status: 'active',
            expiryDate: { lte: threshold },
            renewalAlertSent: false,
        },
        include: { user: { select: { id: true, email: true, fullName: true } } },
    });
}

async function markRenewalAlertSent(documentId) {
    return prisma.taxDocument.update({
        where: { id: documentId },
        data: { renewalAlertSent: true },
    });
}

async function getDocumentForContractorDownload(userId, documentId) {
    const doc = await prisma.taxDocument.findFirst({
        where: { id: documentId, userId },
        select: {
            id: true,
            documentType: true,
            formType: true,
            status: true,
            fullName: true,
            countryOfBirth: true,
            taxId: true,
            dateOfBirth: true,
            isForeignIndividual: true,
            claimTreatyBenefits: true,
            treatyCountry: true,
            treatyArticle: true,
            documentUri: true,
            signatureDate: true,
            expiryDate: true,
            createdAt: true,
        },
    });
    if (!doc) throw Object.assign(new Error('Tax document not found'), { status: 404 });
    return doc;
}

async function getSummary(userId) {
    const all = await prisma.taxDocument.findMany({
        where: { userId },
        select: { status: true, formType: true, expiryDate: true },
    });

    const active = all.filter(d => d.status === 'active');
    const expired = all.filter(d => d.status === 'expired');
    const expiringSoon = active.filter(d => {
        if (!d.expiryDate) return false;
        const daysUntil = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntil <= RENEWAL_ALERT_DAYS_BEFORE;
    });

    return {
        total: all.length,
        active: active.length,
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        byFormType: all.reduce((acc, d) => { acc[d.formType] = (acc[d.formType] || 0) + 1; return acc; }, {}),
    };
}

module.exports = {
    getActiveDocuments,
    getDocumentById,
    listDocuments,
    createDocument,
    updateDocument,
    supersedeDocument,
    markExpired,
    getExpiringDocuments,
    markRenewalAlertSent,
    getDocumentForContractorDownload,
    getSummary,
    setPrisma,
    W8BEN_VALIDITY_YEARS,
    RENEWAL_ALERT_DAYS_BEFORE,
};
