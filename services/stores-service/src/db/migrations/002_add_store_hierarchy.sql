-- Migration: 002_add_store_hierarchy
-- Dominio: stores-service

-- Up Migration
CREATE TABLE IF NOT EXISTS regional (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ciudad (
    id SERIAL PRIMARY KEY,
    fk_regional_id INT NOT NULL REFERENCES regional(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fk_regional_id, nombre)
);

-- Añadimos la columna fk_ciudad_id a Tienda, permitiendo nulos temporalmente
-- para no quebrar las tiendas existentes
ALTER TABLE tienda ADD COLUMN fk_ciudad_id INT REFERENCES ciudad(id) ON DELETE SET NULL;

-- Insertar datos por defecto para mantener compatibilidad
INSERT INTO regional (id, nombre) VALUES (1, 'Regional Principal') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO ciudad (id, fk_regional_id, nombre) VALUES (1, 1, 'Ciudad Principal') ON CONFLICT (fk_regional_id, nombre) DO NOTHING;

-- Actualizar la tienda existente (Sede Principal) para que pertenezca a la ciudad por defecto
UPDATE tienda SET fk_ciudad_id = 1 WHERE id_tienda = 1 AND fk_ciudad_id IS NULL;

-- Opcional: hacer que la columna sea NOT NULL si queremos forzar la jerarquía
-- ALTER TABLE tienda ALTER COLUMN fk_ciudad_id SET NOT NULL;

-- Down Migration
ALTER TABLE tienda DROP COLUMN IF EXISTS fk_ciudad_id;
DROP TABLE IF EXISTS ciudad;
DROP TABLE IF EXISTS regional;
