const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' }); // To run from src/scripts

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'rootpasword',
    port: process.env.DB_PORT || 5432,
});

async function seed() {
    try {
        console.log('Conectando a la base de datos...');

        // Crear tabla Cliente si no existe (la base, por si acaso)
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS Cliente (
                id_usu SERIAL PRIMARY KEY,
                nom_usu VARCHAR(60),
                correo_usu VARCHAR(100) UNIQUE,
                rol_usu VARCHAR(30),
                tel_usu VARCHAR(20)
            );
        `;

        await pool.query(createTableQuery);

        // Agregamos las columnas que falten usando ALTER TABLE
        try {
            await pool.query('ALTER TABLE Cliente ADD COLUMN password_usu VARCHAR(255);');
            console.log('✅ Columna password_usu añadida.');
        } catch (e) { /* Ya existe, ignorar */ }

        try {
            await pool.query('ALTER TABLE Cliente ADD COLUMN intentos_fallidos INT DEFAULT 0;');
            console.log('✅ Columna intentos_fallidos añadida.');
        } catch (e) { /* Ya existe, ignorar */ }

        try {
            await pool.query('ALTER TABLE Cliente ADD COLUMN bloqueado_hasta TIMESTAMP;');
            console.log('✅ Columna bloqueado_hasta añadida.');
        } catch (e) { /* Ya existe, ignorar */ }

        console.log('✅ Tabla Cliente asegurada en la base de datos.');

        // Verificar si el usuario ya existe
        const checkUser = await pool.query('SELECT * FROM Cliente WHERE correo_usu = $1', ['Meneses@gmail.com']);

        if (checkUser.rows.length === 0) {
            // Crear usuario de prueba
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                `INSERT INTO Cliente (nom_usu, correo_usu, password_usu, rol_usu, tel_usu)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['Admin', 'Meneses@gmail.com', hashedPassword, 'admin', '1234567890']
            );
            console.log('   Usuario de prueba creado:');
            console.log('   Email: Meneses@gmail.com');
            console.log('   Password: admin123');
        } else {
            console.log('El usuario de prueba ya existe (Meneses1@gmail.com).');
        }

        // Crear usuario administrador Ruben
        const checkRuben = await pool.query('SELECT * FROM Cliente WHERE correo_usu = $1', ['ruben@kiora.com']);

        if (checkRuben.rows.length === 0) {
            const hashedPasswordRuben = await bcrypt.hash('ruben123', 10);
            await pool.query(
                `INSERT INTO Cliente (nom_usu, correo_usu, password_usu, rol_usu, tel_usu)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['Ruben', 'ruben@kiora.com', hashedPasswordRuben, 'admin', '0987654321']
            );
            console.log('   Usuario administrador creado:');
            console.log('   Email: ruben@kiora.com');
            console.log('   Password: ruben123');
        } else {
            console.log('El usuario administrador ya existe (ruben@kiora.com).');
        }

    } catch (error) {
        console.error('Error durante el seed:', error);
    } finally {
        await pool.end();
        console.log('Conexión cerrada.');
    }
}

seed();
