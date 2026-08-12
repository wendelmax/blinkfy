function serializeError(error) {
    if (!error) return undefined;
    return { name: error.name, message: error.message, stack: error.stack };
}

function write(level, event, fields = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        event,
        ...fields,
    };
    const output = JSON.stringify(payload);
    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
    return payload;
}

const logger = {
    info(event, fields) { return write('info', event, fields); },
    warn(event, fields) { return write('warn', event, fields); },
    error(event, fields = {}) { return write('error', event, { ...fields, error: serializeError(fields.error) }); },
};

module.exports = { logger, serializeError };
