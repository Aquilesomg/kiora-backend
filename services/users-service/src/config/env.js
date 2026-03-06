require('dotenv').config();
const logger = require('./logger');

/**
 * env.js
 * Valida que todas las variables de entorno requeridas existan al arrancar.
 * Si falta alguna, el servidor no inicia y se muestra un error claro.
 */
const REQUIRED_ENV_VARS = [
    'DB_USER',
    'DB_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
    logger.error('Variables de entorno faltantes', { missing });
    process.exit(1);
}

logger.info('Variables de entorno validadas correctamente');
