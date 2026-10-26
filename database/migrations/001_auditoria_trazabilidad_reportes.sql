-- ============================================================================
-- Migración 001 — Auditoría, trazabilidad y reportes (RF-009, RF-010, RF-014, RF-015)
-- IDEMPOTENTE: se puede ejecutar varias veces sin error ni pérdida de datos.
-- init.sql solo corre cuando el volumen de PostgreSQL está vacío; esta migración
-- es la que aplica los cambios sobre una base de datos que ya existe.
-- ============================================================================

-- 1) Nuevo tipo de operación EXPORTACION (RF-014/RF-015: "exportaciones").
ALTER TABLE log_auditoria DROP CONSTRAINT IF EXISTS log_auditoria_tipo_operacion_check;
ALTER TABLE log_auditoria ADD CONSTRAINT log_auditoria_tipo_operacion_check
    CHECK (tipo_operacion IN ('CREACION', 'EDICION', 'ELIMINACION', 'EXPORTACION',
                              'CONSULTA', 'LOGIN', 'LOGOUT'));

-- 2) Índice para el filtro por tipo de operación (RF-015: respuesta < 3 s).
CREATE INDEX IF NOT EXISTS idx_log_tipo ON log_auditoria (tipo_operacion, fecha_hora DESC);

-- 3) Log inmutable (RF-014, regla de negocio): nadie puede editar ni borrar registros,
--    ni siquiera la propia aplicación.
CREATE OR REPLACE FUNCTION bloquear_modificacion_log() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'El log de auditoría es de solo lectura: la operación % no está permitida.', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_inmutable ON log_auditoria;
CREATE TRIGGER trg_log_inmutable
    BEFORE UPDATE OR DELETE ON log_auditoria
    FOR EACH ROW EXECUTE FUNCTION bloquear_modificacion_log();

DROP TRIGGER IF EXISTS trg_log_sin_truncate ON log_auditoria;
CREATE TRIGGER trg_log_sin_truncate
    BEFORE TRUNCATE ON log_auditoria
    FOR EACH STATEMENT EXECUTE FUNCTION bloquear_modificacion_log();

-- 4) Trazabilidad de reportes: qué filtros se usaron y cuántos registros salieron.
ALTER TABLE reporte_generado ADD COLUMN IF NOT EXISTS filtros JSONB;
ALTER TABLE reporte_generado ADD COLUMN IF NOT EXISTS total_registros INTEGER;
