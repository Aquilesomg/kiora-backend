const logger = require('./config/logger');
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`API Gateway iniciado en puerto ${PORT}`);
    logger.info(`Swagger UI: http://localhost:${PORT}/api/docs`);
});
