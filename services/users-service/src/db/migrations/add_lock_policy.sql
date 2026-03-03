-- HU04: Política de bloqueo de cuenta
-- Ejecutar este script en la base de datos de Kiora

ALTER TABLE Cliente
    ADD COLUMN IF NOT EXISTS intentos_fallidos INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP NULL;
