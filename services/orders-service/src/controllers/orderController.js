'use strict';

const orderRepository = require('../repositories/orderRepository');
const logger = require('../config/logger');
const env = require('../config/env');

const VALID_STATES = ['pendiente', 'completada', 'cancelada'];

// GET /api/orders  — lista paginada
const getOrders = async (req, res, next) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page  || 1, 10));
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || 20, 10)));
        const offset = (page - 1) * limit;

        const [rows, count] = await Promise.all([
            orderRepository.findAll({ limit, offset }),
            orderRepository.countAll(),
        ]);
        res.status(200).json({
            data: rows.rows,
            pagination: {
                total: parseInt(count.rows[0].count, 10),
                page,
                limit,
                totalPages: Math.ceil(count.rows[0].count / limit),
            }
        });
    } catch (error) {
        logger.error('Error al listar ventas', { error: error.message });
        next(error);
    }
};

// GET /api/orders/:id
const getOrderById = async (req, res, next) => {
    try {
        const order = await orderRepository.findByIdWithItems(req.params.id);
        if (!order) return res.status(404).json({ error: 'Venta no encontrada.' });
        res.status(200).json(order);
    } catch (error) {
        logger.error('Error al obtener venta', { error: error.message });
        next(error);
    }
};

// POST /api/orders
const createOrder = async (req, res, next) => {
    const { metodopago_usu, items } = req.body;
    
    // El Gateway inyecta x-user-id tras validar el JWT
    const id_usu_header = req.headers['x-user-id'];
    const id_usu = id_usu_header ? parseInt(id_usu_header, 10) : req.body.id_usu;

    if (!id_usu) {
        return res.status(400).json({ error: 'No se pudo identificar al usuario (id_usu faltante).' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items debe ser un array no vacío.' });
    }
    for (const item of items) {
        if (!item.cod_prod || !item.cantidad || item.precio_unit === undefined) {
            return res.status(400).json({
                error: 'Cada item requiere: cod_prod, cantidad y precio_unit.',
            });
        }
        if (Number(item.cantidad) <= 0 || Number(item.precio_unit) < 0) {
            return res.status(400).json({ error: 'cantidad > 0 y precio_unit >= 0.' });
        }
    }

    try {
        const order = await orderRepository.createWithItems({ id_usu, metodopago_usu, items });
        logger.info('Venta creada', { id_vent: order.id_vent, id_usu });
        res.status(201).json(order);
    } catch (error) {
        logger.error('Error al crear venta', { error: error.message });
        next(error);
    }
};


// PUT /api/orders/:id/status
const updateOrderStatus = async (req, res, next) => {
    const { estado } = req.body;
    if (!VALID_STATES.includes(estado)) {
        return res.status(400).json({
            error: `estado debe ser uno de: ${VALID_STATES.join(', ')}.`,
        });
    }
    try {
        const result = await orderRepository.updateStatus(req.params.id, estado);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }
        logger.info('Estado de venta actualizado', { id_vent: req.params.id, estado });

        // ── Automatización: al completar la venta, disparar salidas de inventario ──
        if (estado === 'completada') {
            const order = await orderRepository.findByIdWithItems(req.params.id);
            if (order && order.items && order.items.length > 0) {
                for (const item of order.items) {
                    try {
                        const movRes = await fetch(
                            `${env.inventoryServiceUrl}/api/inventory/movements`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    tipo_mov: 'salida',
                                    cantidad: item.cantidad,
                                    cod_prod: item.cod_prod,
                                    fk_id_vent: Number(req.params.id),
                                }),
                            }
                        );
                        if (!movRes.ok) {
                            const errBody = await movRes.text();
                            logger.warn('No se pudo crear salida de inventario', {
                                cod_prod: item.cod_prod, statusCode: movRes.status, body: errBody,
                            });
                        } else {
                            logger.info('Salida de inventario creada automáticamente', {
                                id_vent: req.params.id, cod_prod: item.cod_prod, cantidad: item.cantidad,
                            });
                        }
                    } catch (syncErr) {
                        logger.error('Error de red al crear salida de inventario', {
                            cod_prod: item.cod_prod, error: syncErr.message,
                        });
                    }
                }
            }
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        logger.error('Error al actualizar estado', { error: error.message });
        next(error);
    }
};

// DELETE /api/orders/:id
const deleteOrder = async (req, res, next) => {
    try {
        const result = await orderRepository.remove(req.params.id);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }
        logger.info('Venta eliminada', { id_vent: req.params.id });
        res.status(200).json({ message: 'Venta eliminada exitosamente.' });
    } catch (error) {
        logger.error('Error al eliminar venta', { error: error.message });
        next(error);
    }
};

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus, deleteOrder };
