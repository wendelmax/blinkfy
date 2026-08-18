const { IntegrationAdapter } = require('./baseAdapter');

class AtsAdapter extends IntegrationAdapter {
    constructor(config = {}) {
        super({ provider: config.provider || 'greenhouse', category: 'ats', config });
    }

    async executeAction(action, payload) {
        switch (action) {
            case 'export_candidate':
                return this.exportCandidate(payload);
            case 'create_candidate':
                return this.createCandidate(payload);
            case 'update_candidate':
                return this.updateCandidate(payload);
            case 'list_jobs':
                return this.listJobs(payload);
            default:
                throw new Error(`Unknown ATS action: ${action}`);
        }
    }

    async exportCandidate({ candidateData, jobId }) {
        const candidateId = `ats_${Date.now()}`;
        return {
            candidateId,
            provider: this.provider,
            externalJobId: jobId,
            status: 'created',
            name: candidateData?.name,
            email: candidateData?.email,
            exportedAt: new Date().toISOString(),
        };
    }

    async createCandidate({ name, email, resumeUrl, source }) {
        const candidateId = `ats_${Date.now()}`;
        return {
            candidateId,
            provider: this.provider,
            name,
            email,
            resumeUrl,
            source: source || 'blinkfy',
            status: 'prospect',
            createdAt: new Date().toISOString(),
        };
    }

    async updateCandidate({ candidateId, fields }) {
        return {
            candidateId,
            provider: this.provider,
            updatedFields: Object.keys(fields || {}),
            updatedAt: new Date().toISOString(),
        };
    }

    async listJobs({ departmentId, status }) {
        return {
            jobs: [],
            provider: this.provider,
            total: 0,
        };
    }
}

module.exports = { AtsAdapter };
