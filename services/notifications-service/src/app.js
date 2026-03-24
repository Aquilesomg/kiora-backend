'use strict';

const express = require('express');
const helmet  = require('helmet');
const logger  = require('./config/logger');
const env     = require('./config/env');

const app = express();

app.use(helmet());
app.use(express.json());

// ── Health-check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
    status: 'ok',
    service: 'notifications-service',
    redis: { host: env.redis.host, port: env.redis.port },
}));

// ── Manejo global de errores ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    logger.error('Error no controlado', { message: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
