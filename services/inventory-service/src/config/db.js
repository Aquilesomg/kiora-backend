'use strict';

const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});

pool.on('error', (err) => {
    logger.error('Error inesperado en el pool de PostgreSQL', { error: err.message });
});

module.exports = pool;
