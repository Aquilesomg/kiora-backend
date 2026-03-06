const logger = require('../config/logger');

/**
 * errorHandler
 * Middleware global de Express para errores.
 * DEBE registrarse al final de todos los middlewares en app.js.
 *
 * Los controllers llaman next(error) para llegar aquí.
 */
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Error interno del servidor.';

    logger.error(message, {
        status,
        method: req.method,
        url: req.originalUrl,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    res.status(status).json({ error: message });
};

module.exports = errorHandler;
