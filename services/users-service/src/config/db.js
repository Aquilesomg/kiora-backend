const { Pool } = require('pg');
require('./env');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error conectando a PostgreSQL:', err.stack);
    }
    console.log('✅ Conectado exitosamente a la base de datos Kiora!');
    release();
});

module.exports = pool;