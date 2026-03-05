const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Importamos la conexión a la base de datos
const db = require('./config/db');

// Importamos las rutas
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Permite envío de cookies desde el frontend
}));
app.use(cookieParser());
app.use(express.json());

// Ruta de salud del servicio
app.get('/api/users/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Users Service Kiora está corriendo 🚀' });
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`🛡️  Users Service ejecutándose en el puerto ${PORT}`);
});