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

// app.use('/api/inventory', require('./routes/inventoryRoutes'));
// app.use('/api/suppliers', require('./routes/supplierRoutes'));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    logger.error('Error no controlado', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
