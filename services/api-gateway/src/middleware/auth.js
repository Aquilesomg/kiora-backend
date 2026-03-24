/**
 * auth.js
 * Middleware de Autenticación Centralizada para el API Gateway.
 */
const jwt = require('jsonwebtoken');

// Rutas que NO requieren validación de JWT (Públicas)
const publicRoutes = [
    '/health',
    '/api/docs',
    '/api/users/auth/login',
    '/api/users/auth/register',
    '/api/users/auth/refresh',
    '/api/users/health',
    '/api/users/ready',
    '/api/users/docs-json'
];

const authMiddleware = (req, res, next) => {
    const path = req.path;

    // Verificar si la ruta es expresamente pública
    const isPublic = publicRoutes.some(route => path.startsWith(route));
    if (isPublic) {
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
            message: 'No se proporcionó token de autenticación. Acceso denegado por el API Gateway.'
        });
    }

    try {
        // Verificar firma y expiración del token
        const secret = process.env.JWT_SECRET || 'secret_de_desarrollo_cambiar_urgente';
        const decoded = jwt.verify(token, secret);

        // Inyectar claims en los headers para que los microservicios aguas abajo lo lean
        req.headers['x-user-id'] = decoded.id;
        if (decoded.role) {
            req.headers['x-user-role'] = decoded.role;
        }
        
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token de autenticación inválido o expirado.',
            details: error.message
        });
    }
};

module.exports = authMiddleware;
