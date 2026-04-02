'use strict';

const db = require('../config/db');

/**
 * inventoryRepository
 * Responsabilidad única: acceso a datos de Proveedor, Inventario y Suministra.
 */

/* ── Proveedores ────────────────────────────────────────────────────────── */

const findAllSuppliers = ({ limit = 100, offset = 0 } = {}) =>
    db.query('SELECT * FROM Proveedor ORDER BY cod_prov LIMIT $1 OFFSET $2', [limit, offset]);

const countAllSuppliers = () => db.query('SELECT COUNT(*) FROM Proveedor');

const findSupplierById = (cod_prov) =>
    db.query('SELECT * FROM Proveedor WHERE cod_prov = $1', [cod_prov]);

/**
 * @param {{ id_prov, nom_prov, tel_prov, tipoid_prov }} fields
 */
const createSupplier = ({ id_prov, nom_prov, tel_prov, tipoid_prov }) =>
    db.query(
        `INSERT INTO Proveedor (id_prov, nom_prov, tel_prov, tipoid_prov)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [id_prov || null, nom_prov, tel_prov || null, tipoid_prov || null]
    );

const updateSupplier = (cod_prov, fields) => {
    const allowed = ['id_prov', 'nom_prov', 'tel_prov', 'tipoid_prov'];
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key));
    if (entries.length === 0) return Promise.resolve({ rows: [] });
    const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
    return db.query(
        `UPDATE Proveedor SET ${setClauses}
         WHERE cod_prov = $${entries.length + 1} RETURNING *`,
        [...entries.map(([, val]) => val), cod_prov]
    );
};

const removeSupplier = (cod_prov) =>
    db.query('DELETE FROM Proveedor WHERE cod_prov = $1 RETURNING cod_prov', [cod_prov]);

/* ── Movimientos de stock ────────────────────────────────────────────────── */

const findAllMovements = ({ cod_prod, limit = 20, offset = 0 } = {}) => {
    if (cod_prod) {
        return db.query(
            'SELECT * FROM Inventario WHERE cod_prod = $1 ORDER BY fecha_mov DESC, id_mov DESC LIMIT $2 OFFSET $3',
            [cod_prod, limit, offset]
        );
    }
    return db.query(
        'SELECT * FROM Inventario ORDER BY fecha_mov DESC, id_mov DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );
};

const countAllMovements = (cod_prod) =>
    cod_prod
        ? db.query('SELECT COUNT(*) FROM Inventario WHERE cod_prod = $1', [cod_prod])
        : db.query('SELECT COUNT(*) FROM Inventario');

/**
 * @param {{ tipo_mov, fecha_mov, cantidad, cod_prod }} fields
 */
const createMovement = ({ tipo_mov, fecha_mov, cantidad, cod_prod }) =>
    db.query(
        `INSERT INTO Inventario (tipo_mov, fecha_mov, cantidad, cod_prod)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [tipo_mov, fecha_mov || new Date(), cantidad, cod_prod]
    );

/* ── Suministra (proveedor ↔ producto + stock) ───────────────────────────── */

const findAllSuministra = ({ limit = 20, offset = 0 } = {}) =>
    db.query(
        `SELECT s.*, p.nom_prov
         FROM Suministra s
         JOIN Proveedor p ON p.cod_prov = s.fk_cod_prov
         ORDER BY s.id
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

const countAllSuministra = () => db.query('SELECT COUNT(*) FROM Suministra');

const findSuministraById = (id) =>
    db.query(
        `SELECT s.*, p.nom_prov
         FROM Suministra s
         JOIN Proveedor p ON p.cod_prov = s.fk_cod_prov
         WHERE s.id = $1`,
        [id]
    );

/**
 * Crea o actualiza (upsert) el registro proveedor-producto.
 * @param {{ fk_cod_prov, cod_prod, stock, stock_minimo }} fields
 */
const upsertSuministra = ({ fk_cod_prov, cod_prod, stock, stock_minimo }) =>
    db.query(
        `INSERT INTO Suministra (fk_cod_prov, cod_prod, stock, stock_minimo)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (fk_cod_prov, cod_prod)
         DO UPDATE SET stock = $3, stock_minimo = $4
         RETURNING *`,
        [fk_cod_prov, cod_prod, stock ?? 0, stock_minimo ?? 0]
    );

/**
 * Devuelve todos los registros donde stock < stock_minimo.
 * HU14 — detectar bajo stock.
 */
const findLowStock = () =>
    db.query(
        `SELECT s.*, p.nom_prov
         FROM Suministra s
         JOIN Proveedor p ON p.cod_prov = s.fk_cod_prov
         WHERE s.stock < s.stock_minimo
         ORDER BY s.id`
    );

module.exports = {
    findAllSuppliers,
    countAllSuppliers,
    findSupplierById,
    createSupplier,
    updateSupplier,
    removeSupplier,
    findAllMovements,
    countAllMovements,
    createMovement,
    findAllSuministra,
    countAllSuministra,
    findSuministraById,
    upsertSuministra,
    findLowStock,
};
