import db from '../config/db';
import { logger } from '@kiora/shared';

export async function createTables() {
    const query = `
    CREATE TABLE IF NOT EXISTS report_orders (
        id_vent INT PRIMARY KEY,
        estado VARCHAR(50) NOT NULL,
        store_id INT NOT NULL,
        montofinal_vent DECIMAL(10,2) NOT NULL,
        metodopago_usu VARCHAR(50),
        fecha_creacion TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_order_items (
        id SERIAL PRIMARY KEY,
        fk_id_vent INT REFERENCES report_orders(id_vent) ON DELETE CASCADE,
        cod_prod VARCHAR(50) NOT NULL,
        cantidad INT NOT NULL,
        precio_unit DECIMAL(10,2) NOT NULL
    );
    `;
    try {
        await db.query(query);
        logger.info('Tablas de reportes sincronizadas');
    } catch (err: any) {
        logger.error('Error creando tablas de reportes', { error: err.message });
    }
}
