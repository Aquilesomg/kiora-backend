'use strict';

const productRepository = require('../repositories/productRepository');
const logger = require('../config/logger');

/**
 * productController
 * Orquesta la lógica de negocio del catálogo de productos.
 * HU10 — createProduct
 * HU11 — updateProduct
 * HU12 — getProducts
 * HU13 — deleteProduct
 * HU15 — getProductById
 */

// GET /api/products  (HU12)
const getProducts = async (req, res, next) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page  || 1, 10));
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || 20, 10)));
        const offset = (page - 1) * limit;

        const [rows, count] = await Promise.all([
            productRepository.findAll({ limit, offset }),
            productRepository.countAll(),
        ]);
        res.status(200).json({
            data:       rows.rows,
            total:      parseInt(count.rows[0].count, 10),
            page,
            totalPages: Math.ceil(count.rows[0].count / limit),
        });
    } catch (error) {
        logger.error('Error al obtener productos', { error: error.message });
        next(error);
    }
};

// GET /api/products/:id  (HU15)
const getProductById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await productRepository.findById(id);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        logger.error('Error al obtener producto', { error: error.message });
        next(error);
    }
};

// POST /api/products  (HU10)
const createProduct = async (req, res, next) => {
    const { nom_prod, descrip_prod, precio_unitario, fechaven_prod, fk_cod_cat } = req.body;

    if (!nom_prod || precio_unitario === undefined) {
        return res.status(400).json({ error: 'nom_prod y precio_unitario son obligatorios.' });
    }
    if (Number(precio_unitario) < 0) {
        return res.status(400).json({ error: 'El precio_unitario no puede ser negativo.' });
    }

    try {
        const result = await productRepository.create({
            nom_prod, descrip_prod, precio_unitario, fechaven_prod, fk_cod_cat
        });
        logger.info('Producto creado', { cod_prod: result.rows[0].cod_prod });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ error: `La categoría con id ${fk_cod_cat} no existe.` });
        }
        logger.error('Error al crear producto', { error: error.message });
        next(error);
    }
};

// PUT /api/products/:id  (HU11)
const updateProduct = async (req, res, next) => {
    const { id } = req.params;

    if (req.body.precio_unitario !== undefined && Number(req.body.precio_unitario) < 0) {
        return res.status(400).json({ error: 'El precio_unitario no puede ser negativo.' });
    }

    try {
        const result = await productRepository.update(id, req.body);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado o ningún campo válido enviado.' });
        }
        logger.info('Producto actualizado', { cod_prod: id });
        res.status(200).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ error: `La categoría con id ${req.body.fk_cod_cat} no existe.` });
        }
        logger.error('Error al actualizar producto', { error: error.message });
        next(error);
    }
};

// DELETE /api/products/:id  (HU13)
const deleteProduct = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await productRepository.remove(id);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        logger.info('Producto eliminado', { cod_prod: id });
        res.status(200).json({ message: 'Producto eliminado exitosamente.' });
    } catch (error) {
        logger.error('Error al eliminar producto', { error: error.message });
        next(error);
    }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
