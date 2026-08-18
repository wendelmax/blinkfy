const integrationService = require('../services/blinkfy/integrationService');
const { getSupportedProviders } = require('../services/blinkfy/adapters/adapterRegistry');

function createIntegrationController({ prisma }) {
    async function listConfigs(req, res) {
        try {
            const { category, status } = req.query;
            const configs = await integrationService.listConfigs(req.user.id, req.workspace.id, { category, status });
            res.json({ items: configs });
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to list integrations' });
        }
    }

    async function getConfig(req, res) {
        try {
            const config = await integrationService.getConfig(req.params.configId);
            res.json(config);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to get integration' });
        }
    }

    async function createConfig(req, res) {
        try {
            const config = await integrationService.createConfig(req.user.id, req.workspace.id, req.body);
            res.status(201).json(config);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to create integration' });
        }
    }

    async function updateConfig(req, res) {
        try {
            const config = await integrationService.updateConfig(req.params.configId, req.body);
            res.json(config);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to update integration' });
        }
    }

    async function deleteConfig(req, res) {
        try {
            await integrationService.deleteConfig(req.params.configId);
            res.status(204).end();
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to delete integration' });
        }
    }

    async function createExecution(req, res) {
        try {
            const execution = await integrationService.createExecution(req.user.id, req.workspace.id, {
                configId: req.params.configId,
                action: req.body.action,
                requestPayload: req.body.requestPayload,
            });
            res.status(201).json(execution);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to create execution' });
        }
    }

    async function approveExecution(req, res) {
        try {
            const execution = await integrationService.approveExecution(req.params.executionId, req.user.id);
            res.json(execution);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to approve execution' });
        }
    }

    async function executeAction(req, res) {
        try {
            const execution = await integrationService.executeAction(req.params.executionId);
            res.json(execution);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to execute action' });
        }
    }

    async function cancelExecution(req, res) {
        try {
            const execution = await integrationService.cancelExecution(req.params.executionId);
            res.json(execution);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to cancel execution' });
        }
    }

    async function listExecutions(req, res) {
        try {
            const { configId, status, action } = req.query;
            const executions = await integrationService.listExecutions(req.user.id, { configId, status, action });
            res.json({ items: executions });
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to list executions' });
        }
    }

    async function listProviders(req, res) {
        try {
            const providers = getSupportedProviders();
            res.json({ items: providers });
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to list providers' });
        }
    }

    return {
        listConfigs, getConfig, createConfig, updateConfig, deleteConfig,
        createExecution, approveExecution, executeAction, cancelExecution,
        listExecutions, listProviders,
    };
}

module.exports = { createIntegrationController };
