-- ============================================================================
-- Migración 002 — Módulo de acciones correctivas (RF-012, RF-013, RF-017, RF-018)
-- IDEMPOTENTE. El documento de RF define el estado inicial como 'Pendiente'
-- (la BD lo llamaba 'Abierta'): se renombra conservando el id y los datos.
-- ============================================================================
ALTER TABLE estado_accion_correctiva
    DROP CONSTRAINT IF EXISTS estado_accion_correctiva_nombre_estado_check;

UPDATE estado_accion_correctiva SET nombre_estado = 'Pendiente' WHERE nombre_estado = 'Abierta';

ALTER TABLE estado_accion_correctiva
    ADD CONSTRAINT estado_accion_correctiva_nombre_estado_check
    CHECK (nombre_estado IN ('Pendiente', 'En Proceso', 'Cerrada', 'Vencida'));

-- Consultas por norma/estado y por plazo (RF-013: carga < 3 s).
CREATE INDEX IF NOT EXISTS idx_accion_norma_estado ON accion_correctiva (id_norma, id_estado_accion);
CREATE INDEX IF NOT EXISTS idx_accion_plazo ON accion_correctiva (fecha_compromiso);
