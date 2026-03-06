/**
 * validate
 * Factory de middleware de validación con Joi.
 * Recibe un schema de Joi y devuelve un middleware que valida req.body.
 *
 * Uso: router.post('/login', validate(loginSchema), loginController)
 */
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const messages = error.details.map((d) => d.message).join(', ');
        return res.status(400).json({ error: messages });
    }

    next();
};

module.exports = validate;
