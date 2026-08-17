const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
let prisma = new PrismaClient();
function setPrisma(client) { prisma = client; }

const PERIOD_MONTHS = { '3m': 3, '6m': 6, '12m': 12 };

function computePeriodBounds(months) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    return { start, end };
}

async function getIncomeHistory({ userId, period = '6m' }) {
    const months = PERIOD_MONTHS[period] || 6;
    const { start, end } = computePeriodBounds(months);

    const [transactions, invoices, candidate] = await Promise.all([
        prisma.walletTransaction.findMany({
            where: { userId, createdAt: { gte: start, lte: end }, status: 'completed' },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.invoice.findMany({
            where: { userId, createdAt: { gte: start, lte: end }, status: { in: ['issued', 'paid'] } },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.candidateProfile.findUnique({ where: { userId } }),
    ]);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } });

    const totalIncomeUsd = transactions
        .filter((t) => t.type !== 'withdrawal')
        .reduce((sum, t) => sum + t.amountUsd, 0);

    const totalIncomeBrl = transactions
        .filter((t) => t.type !== 'withdrawal' && t.amountBrl)
        .reduce((sum, t) => sum + t.amountBrl, 0);

    const totalWithdrawalsUsd = transactions
        .filter((t) => t.type === 'withdrawal')
        .reduce((sum, t) => sum + t.amountUsd, 0);

    const avgExchangeRate = totalIncomeBrl > 0 && totalIncomeUsd > 0
        ? totalIncomeBrl / totalIncomeUsd
        : null;

    return {
        candidate: {
            name: user?.fullName || 'N/A',
            email: user?.email || 'N/A',
            taxResidence: candidate?.taxResidence || 'N/A',
            taxId: candidate?.taxId || null,
        },
        period: { months, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
        summary: {
            totalIncomeUsd,
            totalIncomeBrl,
            totalWithdrawalsUsd,
            netIncomeUsd: totalIncomeUsd - totalWithdrawalsUsd,
            transactionCount: transactions.length,
            invoiceCount: invoices.length,
            avgExchangeRate,
        },
        transactions: transactions.map((t) => ({
            id: t.id,
            type: t.type,
            description: t.description || t.type,
            amountUsd: t.amountUsd,
            amountBrl: t.amountBrl,
            date: t.createdAt.toISOString().slice(0, 10),
        })),
        invoices: invoices.map((i) => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            amountUsd: i.amountUsd,
            amountBrl: i.amountBrl,
            cnaeCode: i.cnaeCode,
            status: i.status,
            date: i.createdAt.toISOString().slice(0, 10),
        })),
    };
}

function generateValidationHash(data) {
    const payload = JSON.stringify({ candidateId: data.candidate.name, period: data.period, summary: data.summary });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

async function generateProofPdf({ userId, period = '6m', baseUrl = 'https://blinkfy.com' }) {
    const history = await getIncomeHistory({ userId, period });
    const validationHash = generateValidationHash(history);
    const validationUrl = `${baseUrl}/api/candidate/proof-of-income/validate?hash=${validationHash}`;

    const qrDataUrl = await QRCode.toDataURL(validationUrl, { width: 120, margin: 1 });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfBuffer = await new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        doc.fontSize(20).font('Helvetica-Bold').text('Blinkfy — Proof of Income', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text('Income Declaration for International Service Provision', { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(12).font('Helvetica-Bold').text('Candidate Information');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Name: ${history.candidate.name}`);
        doc.text(`Email: ${history.candidate.email}`);
        doc.text(`Tax Residence: ${history.candidate.taxResidence}`);
        if (history.candidate.taxId) doc.text(`Tax ID: ${history.candidate.taxId}`);
        doc.moveDown(1);

        doc.fontSize(12).font('Helvetica-Bold').text('Period');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(`${history.period.start} to ${history.period.end} (${history.period.months} months)`);
        doc.moveDown(1);

        doc.fontSize(12).font('Helvetica-Bold').text('Income Summary');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Income (USD): $${history.summary.totalIncomeUsd.toFixed(2)}`);
        doc.text(`Total Income (BRL): R$ ${history.summary.totalIncomeBrl.toFixed(2)}`);
        if (history.summary.avgExchangeRate) {
            doc.text(`Average Exchange Rate: ${history.summary.avgExchangeRate.toFixed(4)} BRL/USD`);
        }
        doc.text(`Total Withdrawals (USD): $${history.summary.totalWithdrawalsUsd.toFixed(2)}`);
        doc.text(`Net Income (USD): $${history.summary.netIncomeUsd.toFixed(2)}`);
        doc.text(`Transactions: ${history.summary.transactionCount}`);
        doc.text(`Invoices: ${history.summary.invoiceCount}`);
        doc.moveDown(1);

        if (history.transactions.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('Transaction History');
            doc.moveDown(0.3);

            const tableTop = doc.y;
            const colWidths = [80, 70, 150, 80, 80];
            const headers = ['Date', 'Type', 'Description', 'USD', 'BRL'];

            doc.fontSize(8).font('Helvetica-Bold');
            headers.forEach((h, i) => {
                doc.text(h, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, { width: colWidths[i] });
            });

            doc.moveDown(0.5);
            doc.font('Helvetica').fontSize(8);

            const maxRows = Math.min(history.transactions.length, 30);
            for (let i = 0; i < maxRows; i++) {
                const t = history.transactions[i];
                const y = doc.y;
                const x = 50;
                doc.text(t.date, x, y, { width: colWidths[0] });
                doc.text(t.type, x + colWidths[0], y, { width: colWidths[1] });
                doc.text((t.description || '').slice(0, 40), x + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
                doc.text(`$${t.amountUsd.toFixed(2)}`, x + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
                doc.text(t.amountBrl ? `R$ ${t.amountBrl.toFixed(2)}` : '—', x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });
                doc.moveDown(0.3);
            }

            if (history.transactions.length > 30) {
                doc.moveDown(0.3);
                doc.text(`... and ${history.transactions.length - 30} more transactions`);
            }
            doc.moveDown(1);
        }

        doc.fontSize(8).font('Helvetica').fillColor('#666666');
        doc.text(`Generated: ${new Date().toISOString()}`, 50, doc.y, { align: 'left' });
        doc.text(`Validation: ${validationHash}`, 50, doc.y + 2, { align: 'left' });
        doc.moveDown(1);

        const qrY = doc.y;
        doc.image(qrDataUrl, 50, qrY, { width: 80, height: 80 });
        doc.fontSize(8).fillColor('#333333').text('Scan to verify', 140, qrY + 30);
        doc.moveDown(1);

        doc.fontSize(7).fillColor('#999999');
        doc.text('This document is auto-generated by Blinkfy for income verification purposes.', 50, doc.y, { align: 'center', width: 500 });
        doc.text('Exchange rates are sourced from Frankfurter API. Values may differ from actual bank rates.', 50, doc.y + 2, { align: 'center', width: 500 });

        doc.end();
    });

    return { pdfBuffer, validationHash, history };
}

function verifyValidationHash(validationHash, data) {
    const expected = generateValidationHash(data);
    return validationHash === expected;
}

module.exports = { getIncomeHistory, generateProofPdf, verifyValidationHash, generateValidationHash, PERIOD_MONTHS, setPrisma };
