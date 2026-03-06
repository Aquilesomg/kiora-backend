const swaggerJsdoc = require('swagger-jsdoc');

/**
 * swagger.js
 * Configuración de Swagger/OpenAPI para la documentación de la API.
 * Accesible en: GET /api/docs
 */
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Kiora — Users Service API',
            version: '1.0.0',
            description: 'API de autenticación y gestión de usuarios para el sistema Kiora.',
        },
        servers: [
            { url: 'http://localhost:3001', description: 'Desarrollo local' },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    // Escanea estas rutas en busca de comentarios JSDoc con @swagger
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
