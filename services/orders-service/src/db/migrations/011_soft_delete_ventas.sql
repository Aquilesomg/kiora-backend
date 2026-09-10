-- Migration: 011_soft_delete_ventas
-- Dominio: orders-service

-- Up Migration
ALTER TABLE venta ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Down Migration
ALTER TABLE venta DROP COLUMN IF EXISTS deleted_at;
