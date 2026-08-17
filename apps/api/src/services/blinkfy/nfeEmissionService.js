const { PrismaClient } = require('@prisma/client');
let prisma = new PrismaClient();
function setPrisma(client) { prisma = client; }

const { logger } = require('../../lib/logger');
const { getDefaultCnae, getCnaeByCode } = require('./cnaeRegistryService');

async function createNfeEmission({ prisma: client, invoiceId, userId, cnaeCode, taxRegime, serviceDescription }) {
    const p = client || prisma;
    const invoice = await p.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'paid') throw new Error('NF-e can only be emitted for paid invoices');

    const existing = await p.nfeEmission.findFirst({ where: { invoiceId } });
    if (existing) throw new Error('NF-e already emitted for this invoice');

    const cnae = getCnaeByCode(cnaeCode) || getDefaultCnae();
    const amountBrl = invoice.amountBrl || invoice.amountUsd * (invoice.exchangeRate || 5.5);
    const exchangeRate = invoice.exchangeRate || amountBrl / invoice.amountUsd;

    return p.nfeEmission.create({
        data: {
            invoiceId,
            userId,
            cnaeCode: cnae.code,
            serviceDescription: serviceDescription || cnae.description,
            amountUsd: invoice.amountUsd,
            amountBrl,
            exchangeRate,
            exchangeRateSource: 'frankfurter',
            taxResidence: invoice.taxResidence || 'brazil',
            taxRegime: taxRegime || cnae.suggestedRegime,
            issExempt: cnae.issExempt,
            status: 'pending',
        },
    });
}

async function emitNfe({ prisma: client, nfeProvider, emissionId }) {
    const p = client || prisma;
    const emission = await p.nfeEmission.findUnique({ where: { id: emissionId } });
    if (!emission) throw new Error('NF-e emission not found');
    if (emission.status !== 'pending') throw new Error(`Cannot emit NF-e in status: ${emission.status}`);

    if (!nfeProvider) {
        await p.nfeEmission.update({
            where: { id: emissionId },
            data: { status: 'error', rejectionReason: 'No NF-e provider configured' },
        });
        throw new Error('No NF-e provider configured');
    }

    await p.nfeEmission.update({ where: { id: emissionId }, data: { status: 'processing' } });

    try {
        const ref = `blinkfy-${emission.id}`;
        const result = await nfeProvider.emitNfe({
            nfeData: {
                ref,
                xml: buildNfeXmlPayload(emission),
            },
        });

        const update = {
            status: result.status,
            providerNfeId: result.providerNfeId,
            nfeNumber: result.nfeNumber,
            nfeKey: result.nfeKey,
            protocolNumber: result.protocolNumber,
        };

        if (result.status === 'authorized') {
            update.authorizedAt = new Date();
            update.emittedAt = new Date();
        }

        return p.nfeEmission.update({ where: { id: emissionId }, data: update });
    } catch (error) {
        await p.nfeEmission.update({
            where: { id: emissionId },
            data: { status: 'error', rejectionReason: error.message },
        });
        logger.error('nfe.emission_failed', { emissionId, error: error.message });
        throw error;
    }
}

async function queryNfeStatus({ prisma: client, nfeProvider, emissionId }) {
    const p = client || prisma;
    const emission = await p.nfeEmission.findUnique({ where: { id: emissionId } });
    if (!emission) throw new Error('NF-e emission not found');

    if (!emission.providerNfeId || !nfeProvider) return emission;

    const result = await nfeProvider.queryNfe({ providerNfeId: emission.providerNfeId });

    const update = {
        status: result.status,
        protocolNumber: result.protocolNumber || emission.protocolNumber,
        nfeNumber: result.nfeNumber || emission.nfeNumber,
        nfeKey: result.nfeKey || emission.nfeKey,
    };

    if (result.xmlUri) update.xmlUri = result.xmlUri;
    if (result.pdfUri) update.pdfUri = result.pdfUri;
    if (result.rejectionReason) update.rejectionReason = result.rejectionReason;

    if (result.status === 'authorized' && !emission.authorizedAt) {
        update.authorizedAt = new Date();
        update.emittedAt = update.emittedAt || new Date();
    }
    if (result.status === 'cancelled' && !emission.cancelledAt) {
        update.cancelledAt = new Date();
    }

    return p.nfeEmission.update({ where: { id: emissionId }, data: update });
}

async function cancelNfeEmission({ prisma: client, nfeProvider, emissionId, reason }) {
    const p = client || prisma;
    const emission = await p.nfeEmission.findUnique({ where: { id: emissionId } });
    if (!emission) throw new Error('NF-e emission not found');
    if (emission.status === 'cancelled') throw new Error('NF-e is already cancelled');
    if (emission.status === 'pending') {
        return p.nfeEmission.update({
            where: { id: emissionId },
            data: { status: 'cancelled', cancelledAt: new Date(), rejectionReason: reason || 'Cancelled by user' },
        });
    }

    if (nfeProvider && emission.providerNfeId) {
        try {
            await nfeProvider.queryNfe({ providerNfeId: emission.providerNfeId });
        } catch (error) {
            logger.warn('nfe.cancel_query_failed', { emissionId, error: error.message });
        }
    }

    return p.nfeEmission.update({
        where: { id: emissionId },
        data: { status: 'cancelled', cancelledAt: new Date(), rejectionReason: reason || 'Cancelled by user' },
    });
}

async function listNfeEmissions({ prisma: client, userId, status, limit = 50 }) {
    const p = client || prisma;
    const where = { userId };
    if (status) where.status = status;
    return p.nfeEmission.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
}

async function getNfeEmission({ prisma: client, emissionId }) {
    const p = client || prisma;
    const emission = await p.nfeEmission.findUnique({ where: { id: emissionId } });
    if (!emission) throw new Error('NF-e emission not found');
    return emission;
}

async function getNfeSummary({ prisma: client, userId }) {
    const p = client || prisma;
    const emissions = await p.nfeEmission.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return {
        totalEmissions: emissions.length,
        authorized: emissions.filter((e) => e.status === 'authorized').length,
        pending: emissions.filter((e) => e.status === 'pending' || e.status === 'processing').length,
        rejected: emissions.filter((e) => e.status === 'rejected' || e.status === 'error').length,
        cancelled: emissions.filter((e) => e.status === 'cancelled').length,
        totalAmountBrl: emissions.filter((e) => e.status === 'authorized').reduce((s, e) => s + e.amountBrl, 0),
        totalAmountUsd: emissions.filter((e) => e.status === 'authorized').reduce((s, e) => s + e.amountUsd, 0),
        recentEmissions: emissions.slice(0, 10).map(formatEmissionSummary),
    };
}

function buildNfeXmlPayload(emission) {
    return {
        natureza_operacao: emission.serviceDescription,
        cnae: emission.cnaeCode,
        valor_total: emission.amountBrl,
        valor_servico: emission.amountBrl,
        iss_exento: emission.issExempt,
        regime_tributario: emission.taxRegime || 'simples_nacional',
    };
}

function formatEmissionSummary(emission) {
    return {
        id: emission.id,
        invoiceId: emission.invoiceId,
        nfeNumber: emission.nfeNumber,
        nfeKey: emission.nfeKey,
        status: emission.status,
        cnaeCode: emission.cnaeCode,
        amountUsd: emission.amountUsd,
        amountBrl: emission.amountBrl,
        issExempt: emission.issExempt,
        protocolNumber: emission.protocolNumber,
        authorizedAt: emission.authorizedAt?.toISOString() || null,
        emittedAt: emission.emittedAt?.toISOString() || null,
        createdAt: emission.createdAt.toISOString(),
    };
}

module.exports = {
    createNfeEmission,
    emitNfe,
    queryNfeStatus,
    cancelNfeEmission,
    listNfeEmissions,
    getNfeEmission,
    getNfeSummary,
    setPrisma,
};
