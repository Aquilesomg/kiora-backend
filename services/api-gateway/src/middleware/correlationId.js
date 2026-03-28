/**
 * correlationId.js
 * Genera un x-correlation-id único por request si el cliente no lo envía.
 * Se propaga automáticamente a los microservicios downstream vía los headers
 * del proxy, y se incluye en la respuesta para facilitar debugging.
 */
const crypto = require('crypto');

const correlationId = (req, res, next) => {
    const id = req.headers['x-correlation-id'] || crypto.randomUUID();
    req.headers['x-correlation-id'] = id;
    res.setHeader('x-correlation-id', id);
    next();
};

module.exports = correlationId;
