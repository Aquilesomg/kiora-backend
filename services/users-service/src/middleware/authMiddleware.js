const jwt = require('jsonwebtoken');

// HU02 – Blacklist de tokens revocados (en memoria)
const tokenBlacklist = new Set();

const addToBlacklist = (token) => {
    tokenBlacklist.add(token);
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    // HU02 – Rechazar tokens revocados (logout)
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ error: 'La sesión ha sido cerrada. Inicia sesión nuevamente.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kiora_secret');
        req.usuario = decoded; // { id_usu, correo_usu, rol_usu }
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
