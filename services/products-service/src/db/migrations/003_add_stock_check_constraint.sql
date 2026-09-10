-- Migration: 003_add_stock_check_constraint
-- Dominio: products-service
-- Añade CHECK constraint para prevenir que stock_actual sea negativo.

-- Up Migration
ALTER TABLE producto
    ADD CONSTRAINT chk_stock_actual_no_negativo CHECK (stock_actual >= 0);

-- Down Migration
ALTER TABLE producto DROP CONSTRAINT IF EXISTS chk_stock_actual_no_negativo;
