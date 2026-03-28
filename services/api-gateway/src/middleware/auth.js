/**
 * auth.js
 * Middleware de Autenticación Centralizada para el API Gateway.
 *
 * ─ Fail-fast: el Gateway NO arranca si JWT_SECRET no está definida.
 * ─ Rutas públicas inteligentes: usa prefijos en vez de lista estática.
 * ─ Inyecta x-user-id y x-user-role para que los microservicios
 *   downstream los lean sin re-verificar el JWT.
 */
const jwt = require('jsonwebtoken');

// ── Fail-fast: jamás arrancar sin secreto ─────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error(
        '❌ JWT_SECRET no está definida. El API Gateway NO puede arrancar de forma segura.\n' +
        '   Configúrala en .env.docker o .env.local.'
    );
    process.exit(1);
}

// ── Prefijos / rutas que NO requieren JWT ─────────────────────────────────
const PUBLIC_PREFIXES = [
    '/health',
    '/api/docs',
    '/api/auth/',          // login, register, refresh, forgot-password, etc.
    '/api/users/health',
    '/api/users/ready',
    '/api/users/docs-json',
];

const isPublicRoute = (path) =>
    PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

// ── Middleware ─────────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
    if (isPublicRoute(req.path)) {
        return next();
    }

    // Buscar el token en headers (Bearer) o cookies
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No se proporcionó token de autenticación. Acceso denegado por el API Gateway.',
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Inyectar claims reales del JWT del users-service
        req.headers['x-user-id'] = String(decoded.id_usu);
        if (decoded.rol_usu) {
            req.headers['x-user-role'] = decoded.rol_usu;
        }

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token de autenticación inválido o expirado.',
            details: error.message,
        });
    }
};

module.exports = authMiddleware;
