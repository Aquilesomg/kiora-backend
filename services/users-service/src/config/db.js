const { Pool } = require('pg');
require('./env');
const logger = require('./logger');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
    if (err) {
        logger.error('Error conectando a PostgreSQL', { error: err.stack });
        return;
    }
    logger.info('Conectado exitosamente a la base de datos Kiora');
    release();
});

module.exports = pool;