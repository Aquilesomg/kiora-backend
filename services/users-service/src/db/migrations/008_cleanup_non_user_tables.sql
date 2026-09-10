-- Migration: 008_cleanup_non_user_tables
-- Dominio: users-service
-- Elimina tablas de otros dominios que fueron creadas por error en la
-- migración 001_schema_inicial. Cada tabla es responsabilidad del
-- servicio que la posee:
--   · Categoria, Producto      → products-service
--   · Proveedor, Inventario,
--     Suministra               → inventory-service
--   · Ventas, Producto_Venta,
--     Factura                  → orders-service
--
-- Las FK cruzadas entre dominios desaparecen: la consistencia se
-- mantiene a nivel de aplicación via llamadas HTTP entre servicios.

-- Up Migration
-- El orden importa: primero las tablas dependientes, luego las base.
DROP TABLE IF EXISTS factura;
DROP TABLE IF EXISTS producto_venta;
DROP TABLE IF EXISTS venta;
DROP TABLE IF EXISTS suministra;
DROP TABLE IF EXISTS inventario;
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS proveedor;
DROP TABLE IF EXISTS categoria;

-- Down Migration
-- No restauramos: estas tablas no pertenecen a este servicio.
-- Para un rollback real, ejecutar las migraciones iniciales del
-- servicio correspondiente (products-service, inventory-service,
-- orders-service).
