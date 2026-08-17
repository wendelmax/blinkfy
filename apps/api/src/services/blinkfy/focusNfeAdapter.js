const { logger } = require('../../lib/logger');

function createFocusNfeAdapter({ apiUrl, apiToken } = {}) {
    const baseUrl = apiUrl || process.env.FOCUS_NFE_API_URL || 'https://api.focusnfe.com.br/v2';
    const token = apiToken || process.env.FOCUS_NFE_API_TOKEN;

    function buildAuth() {
        return { Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}` };
    }

    return {
        provider: 'focus_nfe',

        async emitNfe({ nfeData }) {
            if (!token) throw new Error('FOCUS_NFE_API_TOKEN is required');

            const response = await fetch(`${baseUrl}/nfe?ref=${encodeURIComponent(nfeData.ref)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...buildAuth() },
                body: JSON.stringify(nfeData.xml),
            });

            if (!response.ok) {
                const body = await response.text();
                logger.error('focus_nfe.emit_failed', { status: response.status, body });
                throw new Error(`Focus NFe emission failed: ${response.status}`);
            }

            const result = await response.json();
            return {
                providerNfeId: result.referencia || nfeData.ref,
                status: result.status === 'autorizado' ? 'authorized' : 'processing',
                protocolNumber: result.numero_protocolo || null,
                nfeNumber: result.numero || null,
                nfeKey: result.chave_acesso || null,
            };
        },

        async queryNfe({ providerNfeId }) {
            if (!token) throw new Error('FOCUS_NFE_API_TOKEN is required');
            if (!providerNfeId) throw new Error('providerNfeId is required');

            const response = await fetch(`${baseUrl}/nfe/${encodeURIComponent(providerNfeId)}`, {
                headers: buildAuth(),
            });

            if (!response.ok) {
                const body = await response.text();
                logger.error('focus_nfe.query_failed', { status: response.status, body });
                throw new Error(`Focus NFe query failed: ${response.status}`);
            }

            const result = await response.json();
            return {
                status: result.situacao === 'autorizado' ? 'authorized' :
                    result.situacao === 'cancelado' ? 'cancelled' :
                    result.situacao === 'denegado' ? 'rejected' : 'processing',
                protocolNumber: result.numero_protocolo || null,
                nfeNumber: result.numero || null,
                nfeKey: result.chave_acesso || null,
                xmlUri: result.xml || null,
                pdfUri: result.danfe || null,
                rejectionReason: result.motivo || null,
            };
        },
    };
}

module.exports = { createFocusNfeAdapter };
