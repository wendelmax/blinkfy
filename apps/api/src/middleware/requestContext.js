const { randomUUID } = require('node:crypto');

function requestContext(req, res, next) {
    const requestId = req.get('x-request-id') || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
}

module.exports = { requestContext };
