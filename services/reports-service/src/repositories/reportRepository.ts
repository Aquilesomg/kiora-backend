import db from '../config/db';
import { logger } from '@kiora/shared';

export async function upsertOrder(orderData: any) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Upsert report_orders
        const orderQuery = `
            INSERT INTO report_orders (id_vent, estado, store_id, montofinal_vent, metodopago_usu, fecha_creacion)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id_vent) DO UPDATE SET
                estado = EXCLUDED.estado,
                montofinal_vent = EXCLUDED.montofinal_vent,
                metodopago_usu = EXCLUDED.metodopago_usu
            RETURNING *;
        `;
        await client.query(orderQuery, [
            orderData.orderId || orderData.id_vent,
            orderData.estado,
            orderData.store_id || 1,
            orderData.montofinal_vent,
            orderData.metodopago_usu,
            orderData.fecha_creacion
        ]);

        // 2. Refresh items (Delete & Insert para evitar complejidad)
        await client.query('DELETE FROM report_order_items WHERE fk_id_vent = $1', [orderData.orderId || orderData.id_vent]);
        
        if (orderData.items && orderData.items.length > 0) {
            for (const item of orderData.items) {
                const itemQuery = `
                    INSERT INTO report_order_items (fk_id_vent, cod_prod, cantidad, precio_unit)
                    VALUES ($1, $2, $3, $4)
                `;
                await client.query(itemQuery, [
                    orderData.orderId || orderData.id_vent,
                    item.cod_prod,
                    item.cantidad,
                    item.precio_unit
                ]);
            }
        }
        
        await client.query('COMMIT');
        logger.debug('Orden guardada en réplica de reportes', { orderId: orderData.orderId || orderData.id_vent });
    } catch (err: any) {
        await client.query('ROLLBACK');
        logger.error('Error haciendo upsert de orden en reportes', { error: err.message });
        throw err;
    } finally {
        client.release();
    }
}

export async function getOrders(desde?: string, hasta?: string) {
    let query = `
        SELECT 
            ro.id_vent, ro.estado, ro.store_id, ro.montofinal_vent, ro.metodopago_usu, ro.fecha_creacion,
            json_agg(json_build_object(
                'cod_prod', roi.cod_prod,
                'cantidad', roi.cantidad,
                'precio_unit', roi.precio_unit
            )) as items
        FROM report_orders ro
        LEFT JOIN report_order_items roi ON ro.id_vent = roi.fk_id_vent
        WHERE 1=1
    `;
    const params: any[] = [];

    if (desde) {
        params.push(desde);
        query += ` AND ro.fecha_creacion >= $${params.length}`;
    }
    if (hasta) {
        params.push(`${hasta} 23:59:59`);
        query += ` AND ro.fecha_creacion <= $${params.length}`;
    }

    query += ` GROUP BY ro.id_vent ORDER BY ro.fecha_creacion DESC`;
    
    const res = await db.query(query, params);
    return res.rows;
}

export async function countOrders() {
    const res = await db.query('SELECT COUNT(*) as total FROM report_orders');
    return parseInt(res.rows[0].total, 10);
}

export async function getOrderById(orderId: number | string) {
    const query = `
        SELECT 
            ro.id_vent, ro.estado, ro.store_id, ro.montofinal_vent, ro.metodopago_usu, ro.fecha_creacion,
            json_agg(json_build_object(
                'cod_prod', roi.cod_prod,
                'cantidad', roi.cantidad,
                'precio_unit', roi.precio_unit
            )) as items
        FROM report_orders ro
        LEFT JOIN report_order_items roi ON ro.id_vent = roi.fk_id_vent
        WHERE ro.id_vent = $1
        GROUP BY ro.id_vent
    `;
    const res = await db.query(query, [orderId]);
    return res.rows[0];
}
