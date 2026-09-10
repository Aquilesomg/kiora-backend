import { upsertOrder, countOrders } from '../repositories/reportRepository';
import { logger } from '@kiora/shared';

export async function runBackfill() {
    try {
        const total = await countOrders();
        if (total > 0) {
            logger.info('Backfill no necesario, la base de datos de reportes ya contiene datos.', { count: total });
            return;
        }

        logger.info('Iniciando sincronización inicial (Backfill) desde orders-service...');
        const ordersUrl = process.env.ORDERS_SERVICE_URL || 'http://localhost:3004';
        const fetchUrl = `${ordersUrl}/api/orders/export/full`;

        const response = await fetch(fetchUrl);
        if (!response.ok) {
            logger.error('Error obteniendo historial de orders-service para backfill', { status: response.status });
            return;
        }

        const data = await response.json();
        
        let synced = 0;
        for (const order of data) {
            // El endpoint de export full devuelve: id_vent, estado, store_id, montofinal_vent, etc.
            const orderData = {
                orderId: order.id_vent,
                estado: order.estado,
                store_id: order.store_id || 1,
                montofinal_vent: order.montofinal_vent,
                metodopago_usu: order.metodopago_usu,
                fecha_creacion: order.fecha_creacion,
                items: order.items || [] // Si no vienen items, se ignora pero la orden queda
            };
            try {
                await upsertOrder(orderData);
                synced++;
            } catch (err: any) {
                logger.error('Error insertando orden en backfill', { orderId: order.id_vent, error: err.message });
            }
        }
        logger.info('Sincronización inicial completada', { total_synced: synced });
    } catch (err: any) {
        logger.error('Error crítico durante el backfill', { error: err.message });
    }
}
