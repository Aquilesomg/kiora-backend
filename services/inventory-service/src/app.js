'use strict';

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const env     = require('./config/env');
const logger  = require('./config/logger');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'inventory-service' }));

// ── Readiness (verifica conectividad con PostgreSQL) ──────────────────────
const db = require('./config/db');
app.get('/health/ready', async (_req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({ status: 'ready', checks: { postgres: true } });
    } catch (err) {
        logger.warn('Readiness check falló', { error: err.message });
        res.status(503).json({ status: 'not_ready', error: 'PostgreSQL no responde.' });
    }
});

// app.use('/api/inventory', require('./routes/inventoryRoutes'));
// app.use('/api/suppliers', require('./routes/supplierRoutes'));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    logger.error('Error no controlado', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
