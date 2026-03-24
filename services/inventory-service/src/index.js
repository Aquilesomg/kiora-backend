'use strict';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const env    = require('./config/env');
const logger = require('./config/logger');
const app    = require('./app');

app.listen(env.port, () => {
    logger.info(`inventory-service corriendo en el puerto ${env.port}`, {
        nodeEnv: env.nodeEnv,
        db: `${env.db.host}:${env.db.port}/${env.db.name}`,
    });
});
