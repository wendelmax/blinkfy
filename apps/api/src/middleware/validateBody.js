function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body ?? {});
        if (!result.success) return res.status(400).json({ message: 'Invalid request body', errors: result.error.issues.map((i) => ({ path: i.path, message: i.message })) });
        req.body = result.data;
        return next();
    };
}
module.exports = { validateBody };
