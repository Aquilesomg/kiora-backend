-- Migration: 009_add_vencimiento_to_lotes
-- Dominio: inventory-service
-- Añade fecha de vencimiento al rastreo de lotes y stock disponible.

-- Up Migration
ALTER TABLE inventario
ADD COLUMN fecha_vencimiento DATE;

ALTER TABLE suministra
ADD COLUMN fecha_vencimiento DATE;

-- Comentario: La fecha_vencimiento en Inventario rastrea el lote específico que entró.
-- La fecha_vencimiento en Suministra representa la fecha de caducidad del stock actual 
-- proporcionado por ese proveedor. En un sistema real de lotes puros, Suministra 
-- tendría múltiples filas por producto-proveedor si difieren las fechas, pero para
-- este MVP, mantenemos la tabla plana y actualizamos la fecha con el lote más reciente.

-- Down Migration
ALTER TABLE suministra DROP COLUMN IF EXISTS fecha_vencimiento;
ALTER TABLE inventario DROP COLUMN IF EXISTS fecha_vencimiento;
