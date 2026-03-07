const jwt = require('jsonwebtoken');
const blacklist = require('../config/blacklist');

// Validación crítica: JWT_SECRET debe estar definido
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno. La aplicación no puede iniciar de forma segura.');
}

// HU02 – Blacklist de tokens revocados (Redis con TTL automático)
const addToBlacklist = (token) => blacklist.add(token);

const verifyToken = async (req, res, next) => {
    // 1. Intentar leer de la cookie HttpOnly (clientes web)
    let token = req.cookies?.token;

    // 2. Si no hay cookie, leer del header Authorization (clientes móviles)
    if (!token) {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    // HU02 – Rechazar tokens revocados (logout)
    if (await blacklist.has(token)) {
        return res.status(401).json({ error: 'La sesión ha sido cerrada. Inicia sesión nuevamente.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded; // { id_usu, correo_usu, rol_usu }
        req.token = token;     // guardar para el logout
        next();
    } catch (error) {
        // HU03 – Distinguir token expirado vs inválido
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'La sesión ha expirado. Inicia sesión nuevamente.' });
        }
        return res.status(403).json({ error: 'Token inválido.' });
    }
};

const isAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.rol_usu !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo el administrador puede realizar esta acción.' });
    }
    next();
};

module.exports = { verifyToken, isAdmin, addToBlacklist };
