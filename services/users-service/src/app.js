const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

/**
 * app.js
 * Configuración de Express separada del arranque del servidor.
 * Importado tanto por index.js (servidor real) como por los tests.
 */
const app = express();

// ── Seguridad ──────────────────────────────────────────────────────────────
app.use(helmet());  // Agrega cabeceras de seguridad HTTP automáticamente

// ── CORS ───────────────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-type'],
    credentials: true,
}));

// ── Parsers ────────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/users/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Users Service Kiora está corriendo' });
});

// ── Documentación Swagger ──────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Manejo centralizado de errores (SIEMPRE al final) ──────────────────────
app.use(errorHandler);

module.exports = app;
