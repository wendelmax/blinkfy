const { logger } = require('../../lib/logger');

const CNAE_REGISTRY = {
    '6201-5/0': {
        code: '6201-5/0',
        description: 'Desenvolvimento de programas de computador sob encomenda',
        category: 'Software Development',
        issExempt: true,
        taxRegimes: ['simples_nacional', 'lucro_presumido'],
        suggestedRegime: 'simples_nacional',
        applicableFor: 'Service export of custom software development',
    },
    '6202-3/0': {
        code: '6202-3/0',
        description: 'Desenvolvimento e licenciamento de programas de computador customizaveis',
        category: 'IT Consulting',
        issExempt: true,
        taxRegimes: ['simples_nacional', 'lucro_presumido'],
        suggestedRegime: 'simples_nacional',
        applicableFor: 'IT consulting and custom software licensing',
    },
    '6203-1/0': {
        code: '6203-1/0',
        description: 'Desenvolvimento e licenciamento de programas de computador nao-customizaveis',
        category: 'Software Licensing',
        issExempt: true,
        taxRegimes: ['simples_nacional', 'lucro_presumido'],
        suggestedRegime: 'simples_nacional',
        applicableFor: 'Software product licensing',
    },
    '6311-9/0': {
        code: '6311-9/0',
        description: 'Tratamento de dados, provedores de servicos de aplicacao e servicos de hospedagem',
        category: 'Data Processing',
        issExempt: false,
        taxRegimes: ['simples_nacional', 'lucro_presumido'],
        suggestedRegime: 'lucro_presumido',
        applicableFor: 'Data processing and hosting services',
    },
    '6204-0/0': {
        code: '6204-0/0',
        description: 'Suporte tecnico, manutencao e outros servicos em tecnologia da informacao',
        category: 'IT Support',
        issExempt: true,
        taxRegimes: ['simples_nacional', 'lucro_presumido'],
        suggestedRegime: 'simples_nacional',
        applicableFor: 'IT support and maintenance services',
    },
    '6209-1/0': {
        code: '6209-1/0',
        description: 'Suporte tecnico, manutencao e outros servicos em tecnologia da informacao',
        category: 'IT Support & Maintenance',
        issExempt: true,
        taxRegimes: ['simples_nacional', 'lucro_presumido'],
        suggestedRegime: 'simples_nacional',
        applicableFor: 'Technical support and IT maintenance',
    },
    '7490-1/0': {
        code: '7490-1/0',
        description: 'Servicos profissionais, creativeos e especializados nao classificados em outra parte',
        category: 'Professional Services',
        issExempt: false,
        taxRegimes: ['simples_nacional', 'lucro_presumido', 'mei'],
        suggestedRegime: 'simples_nacional',
        applicableFor: 'General professional/consulting services',
    },
};

function listCnaeCodes() {
    return Object.values(CNAE_REGISTRY);
}

function getCnaeByCode(code) {
    return CNAE_REGISTRY[code] || null;
}

function suggestCnae({ serviceType, taxResidence = 'brazil' }) {
    if (taxResidence !== 'brazil') return null;

    const normalized = (serviceType || '').toLowerCase().replace(/[_\s]+/g, ' ').trim();

    if (normalized.includes('software') && normalized.includes('custom')) return CNAE_REGISTRY['6201-5/0'];
    if (normalized.includes('consulting') || normalized.includes('it')) return CNAE_REGISTRY['6202-3/0'];
    if (normalized.includes('licensing') || normalized.includes('license')) return CNAE_REGISTRY['6203-1/0'];
    if (normalized.includes('data') || normalized.includes('hosting')) return CNAE_REGISTRY['6311-9/0'];
    if (normalized.includes('support') || normalized.includes('maintenance')) return CNAE_REGISTRY['6204-0/0'];
    return CNAE_REGISTRY['6201-5/0'];
}

function getDefaultCnae() {
    return CNAE_REGISTRY['6201-5/0'];
}

module.exports = { CNAE_REGISTRY, listCnaeCodes, getCnaeByCode, suggestCnae, getDefaultCnae };
