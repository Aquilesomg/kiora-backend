-- Migración 004: Añadir campo de imagen a productos
ALTER TABLE producto ADD COLUMN url_imagen VARCHAR(500);
