const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importamos la conexión a la base de datos
const db = require('./config/db');

// Importamos las rutas
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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