require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Seguridad y Middlewares Globales
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(morgan('dev'));
app.use(cookieParser()); // Para poder leer cookies

// Limitador de peticiones (Rate Limiting)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 peticiones por IP
    message: { error: 'Too Many Requests', message: 'Límite de peticiones excedido, intenta más tarde.' }
});
app.use('/api', limiter);

// Swagger Unificado (API Docs)
const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
        urls: [
            { url: '/api/users/docs-json', name: 'Users Service' },
            // Agregarás más en el futuro: { url: '/api/products/docs-json', name: 'Products Service' },
        ]
    }
};
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(null, swaggerOptions));

// Autenticación Centralizada JWT (Protege todo excepto publicRoutes en auth.js)
app.use(authMiddleware);

// Configuración de Rutas de Microservicios (Proxy)
const services = {
    users: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
    products: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3002',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
    orders: process.env.ORDERS_SERVICE_URL || 'http://localhost:3004',
    notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3005'
};

// Función para unificar errores cuando un microservicio se cae
const onProxyError = (serviceName) => (err, req, res) => {
    console.error(`[Proxy Error] ${serviceName}:`, err.message);
    res.status(503).json({
        error: 'Service Unavailable',
        service: serviceName,
        message: 'El microservicio no está disponible en este momento.'
    });
};

// Configurar Proxies transparentes (no eliminan el prefijo al enviar la petición)
const transparentProxy = (serviceName, target) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path, req) => req.originalUrl, // Conserva la ruta original (/api/users/...)
        onError: onProxyError(serviceName)
    });
};

app.use('/api/users', transparentProxy('users-service', services.users));
app.use('/api/auth', transparentProxy('users-service', services.users)); // Rutas de auth del users-service
app.use('/api/products', transparentProxy('products-service', services.products));
app.use('/api/inventory', transparentProxy('inventory-service', services.inventory));
app.use('/api/orders', transparentProxy('orders-service', services.orders));
app.use('/api/notifications', transparentProxy('notifications-service', services.notifications));

// Ruta de health check local del API Gateway
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'API Gateway is running' });
});

// Manejo de errores globales no capturados
app.use((err, req, res, next) => {
    console.error('API Gateway Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Gateway panic' });
});

app.listen(PORT, () => {
    console.log(`API Gateway started on port ${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api/docs`);
});
