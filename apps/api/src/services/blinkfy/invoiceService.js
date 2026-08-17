const { PrismaClient } = require('@prisma/client');
let prisma = new PrismaClient();
function setPrisma(client) { prisma = client; }

const CNAE_CODES = {
    software_development: '6201-5/0',
    it_consulting: '6202-3/0',
    data_processing: '6311-9/0',
    softwarelicensing: '6203-1/0',
};

function generateInvoiceNumber() {
    const date = new Date();
    const prefix = `BF-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    return `${prefix}-${seq}`;
}

async function createInvoice({ userId, placementId, amountUsd, amountBrl, exchangeRate, taxResidence, cnaeCode, currency }) {
    if (!userId) throw new Error('userId is required');
    if (!amountUsd || amountUsd <= 0) throw new Error('amountUsd must be positive');

    const invoiceNumber = generateInvoiceNumber();
    const resolvedCnae = cnaeCode || CNAE_CODES.software_development;

    const invoice = await prisma.invoice.create({
        data: {
            userId,
            placementId: placementId || null,
            invoiceNumber,
            amountUsd,
            amountBrl: amountBrl ?? null,
            exchangeRate: exchangeRate ?? null,
            taxResidence: taxResidence || null,
            cnaeCode: resolvedCnae,
            status: 'draft',
        },
    });

    return invoice;
}

async function issueInvoice(invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'draft') throw new Error(`Cannot issue invoice in status: ${invoice.status}`);

    return prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'issued', issuedAt: new Date() },
    });
}

async function markInvoicePaid(invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'issued') throw new Error(`Cannot mark paid invoice in status: ${invoice.status}`);

    return prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'paid', paidAt: new Date() },
    });
}

async function voidInvoice(invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid') throw new Error('Cannot void a paid invoice');

    return prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'void' },
    });
}

async function listInvoices(userId, filters = {}) {
    const where = { userId };
    if (filters.status) where.status = filters.status;

    return prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 50,
    });
}

async function getInvoice(invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
}

async function getInvoiceSummary(userId) {
    const invoices = await prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    const totalIssued = invoices.filter((i) => i.status === 'issued' || i.status === 'paid').reduce((s, i) => s + i.amountUsd, 0);
    const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amountUsd, 0);
    const totalPending = invoices.filter((i) => i.status === 'issued').reduce((s, i) => s + i.amountUsd, 0);

    return {
        totalIssued,
        totalPaid,
        totalPending,
        invoiceCount: invoices.length,
        cnaeCode: CNAE_CODES.software_development,
        recentInvoices: invoices.slice(0, 10).map((i) => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            amountUsd: i.amountUsd,
            amountBrl: i.amountBrl,
            status: i.status,
            issuedAt: i.issuedAt?.toISOString() ?? null,
            paidAt: i.paidAt?.toISOString() ?? null,
            createdAt: i.createdAt.toISOString(),
        })),
    };
}

module.exports = {
    createInvoice,
    issueInvoice,
    markInvoicePaid,
    voidInvoice,
    listInvoices,
    getInvoice,
    getInvoiceSummary,
    CNAE_CODES,
    generateInvoiceNumber,
    setPrisma,
};
