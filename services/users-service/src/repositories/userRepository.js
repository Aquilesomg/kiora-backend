const db = require('../config/db');

/**
 * userRepository
 * Responsabilidad única: todas las operaciones de acceso a datos
 * de la tabla Cliente. Ningún archivo externo hace queries directas.
 */

const findByEmail = (correo_usu) =>
    db.query('SELECT * FROM Cliente WHERE correo_usu = $1', [correo_usu]);

const findById = (id_usu) =>
    db.query(
        'SELECT id_usu, nom_usu, correo_usu, rol_usu, bloqueado_hasta FROM Cliente WHERE id_usu = $1',
        [id_usu]
    );

const findProfile = (id_usu) =>
    db.query(
        'SELECT id_usu, nom_usu, correo_usu, rol_usu, tel_usu FROM Cliente WHERE id_usu = $1',
        [id_usu]
    );

const findAll = (limit = 20, offset = 0) =>
    db.query(
        `SELECT id_usu, nom_usu, correo_usu, rol_usu, tel_usu, intentos_fallidos, bloqueado_hasta
         FROM Cliente
         ORDER BY id_usu
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

const countAll = () =>
    db.query('SELECT COUNT(*) FROM Cliente');

const create = (nom_usu, correo_usu, hashedPassword, rol_usu, tel_usu) =>
    db.query(
        `INSERT INTO Cliente (nom_usu, correo_usu, password_usu, rol_usu, tel_usu)
         VALUES ($1, $2, $3, $4, $5) RETURNING id_usu`,
        [nom_usu, correo_usu, hashedPassword, rol_usu || 'cliente', tel_usu || null]
    );

const incrementLoginAttempts = (id_usu, intentos) =>
    db.query(
        'UPDATE Cliente SET intentos_fallidos = $1 WHERE id_usu = $2',
        [intentos, id_usu]
    );

const blockUser = (id_usu, intentos) =>
    db.query(
        `UPDATE Cliente SET intentos_fallidos = $1, bloqueado_hasta = '9999-12-31 23:59:59' WHERE id_usu = $2`,
        [intentos, id_usu]
    );

const resetLoginAttempts = (id_usu) =>
    db.query(
        'UPDATE Cliente SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usu = $1',
        [id_usu]
    );

const unlock = (id_usu) =>
    db.query(
        'UPDATE Cliente SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usu = $1 RETURNING id_usu, nom_usu, correo_usu',
        [id_usu]
    );

module.exports = {
    findByEmail,
    findById,
    findProfile,
    findAll,
    countAll,
    create,
    incrementLoginAttempts,
    blockUser,
    resetLoginAttempts,
    unlock,
};
