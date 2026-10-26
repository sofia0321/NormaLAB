CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE rol (
    id_rol      SERIAL PRIMARY KEY,
    nombre_rol  VARCHAR(30) NOT NULL UNIQUE
        CHECK (nombre_rol IN ('Profesional SST', 'Administrador', 'Auditor'))
);

CREATE TABLE usuario (
    id_usuario      SERIAL PRIMARY KEY,
    nombre_usuario  VARCHAR(50) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    id_rol          INTEGER NOT NULL REFERENCES rol(id_rol),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    ultimo_acceso   TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. CATÁLOGOS
-- ---------------------------------------------------------------------
CREATE TABLE tipo_norma (
    id_tipo_norma SERIAL PRIMARY KEY,
    nombre_tipo   VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE entidad_emisora (
    id_entidad SERIAL PRIMARY KEY,
    nombre     VARCHAR(250) NOT NULL UNIQUE
);

CREATE TABLE estado_vigencia (
    id_estado_vigencia SERIAL PRIMARY KEY,
    nombre_estado       VARCHAR(20) NOT NULL UNIQUE
        CHECK (nombre_estado IN ('Vigente', 'Derogada', 'Modificada'))
);

CREATE TABLE estado_cumplimiento (
    id_estado_cumplimiento SERIAL PRIMARY KEY,
    nombre_estado VARCHAR(30) NOT NULL UNIQUE
        CHECK (nombre_estado IN ('Cumple', 'No Cumple', 'En Proceso', 'No Aplica'))
);

CREATE TABLE frecuencia_seguimiento (
    id_frecuencia SERIAL PRIMARY KEY,
    nombre_frecuencia VARCHAR(40) NOT NULL UNIQUE
);

-- 3. GESTIÓN NORMATIVA 
CREATE TABLE norma (
    id_norma                 SERIAL PRIMARY KEY,
    id_tipo_norma             INTEGER NOT NULL REFERENCES tipo_norma(id_tipo_norma),
    numero                    VARCHAR(30) NOT NULL,
    anio                      INTEGER NOT NULL CHECK (anio >= 1900),
    id_entidad_emisora        INTEGER NOT NULL REFERENCES entidad_emisora(id_entidad),
    titulo                    VARCHAR(400) NOT NULL,
    descripcion               TEXT,
    articulos_que_aplican     TEXT,
    exigencia_legal           TEXT,
    registros_evidencia_tipo  TEXT,
    id_estado_vigencia        INTEGER NOT NULL REFERENCES estado_vigencia(id_estado_vigencia),
    fecha_vigencia            DATE,
    id_frecuencia_seguimiento INTEGER REFERENCES frecuencia_seguimiento(id_frecuencia),
    responsable_cargo         VARCHAR(200),
    id_usuario_responsable    INTEGER REFERENCES usuario(id_usuario),
    fecha_registro            TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_ultima_evaluacion   DATE,
    UNIQUE (id_tipo_norma, numero, anio)
);
CREATE INDEX idx_norma_titulo ON norma USING GIN (to_tsvector('spanish', titulo));

CREATE TABLE version_norma (
    id_version        SERIAL PRIMARY KEY,
    id_norma          INTEGER NOT NULL REFERENCES norma(id_norma) ON DELETE CASCADE,
    numero_version     INTEGER NOT NULL,
    contenido_anterior JSONB NOT NULL,
    fecha_version      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_norma, numero_version)
);

-- 4. SEGUIMIENTO DE CUMPLIMIENTO 
CREATE TABLE seguimiento_cumplimiento (
    id_seguimiento         SERIAL PRIMARY KEY,
    id_norma               INTEGER NOT NULL REFERENCES norma(id_norma) ON DELETE CASCADE,
    id_estado_cumplimiento INTEGER NOT NULL REFERENCES estado_cumplimiento(id_estado_cumplimiento),
    nombre_responsable     VARCHAR(150),
    fecha_evaluacion       DATE NOT NULL DEFAULT CURRENT_DATE,
    acciones_realizadas    TEXT,
    id_usuario_registro    INTEGER NOT NULL REFERENCES usuario(id_usuario),
    fecha_registro         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_seguimiento_norma ON seguimiento_cumplimiento (id_norma, fecha_evaluacion DESC);

-- 5. ARTÍCULOS APLICABLES 
CREATE TABLE articulo_aplicable (
    id_articulo            SERIAL PRIMARY KEY,
    id_norma               INTEGER NOT NULL REFERENCES norma(id_norma) ON DELETE CASCADE,
    numero_articulo         VARCHAR(30) NOT NULL,
    descripcion             TEXT NOT NULL,
    obligacion_impuesta     TEXT,
    id_estado_cumplimiento  INTEGER NOT NULL REFERENCES estado_cumplimiento(id_estado_cumplimiento),
    fecha_evaluacion        DATE,
    id_usuario_responsable  INTEGER REFERENCES usuario(id_usuario),
    UNIQUE (id_norma, numero_articulo)
);

CREATE TABLE evidencia (
    id_evidencia    SERIAL PRIMARY KEY,
    id_articulo     INTEGER NOT NULL REFERENCES articulo_aplicable(id_articulo) ON DELETE CASCADE,
    nombre_archivo   VARCHAR(255) NOT NULL,
    ruta_archivo     VARCHAR(500) NOT NULL,
    tipo_archivo     VARCHAR(10) NOT NULL,
    tamano_bytes      BIGINT NOT NULL CHECK (tamano_bytes > 0),
    fecha_carga      TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario_carga INTEGER NOT NULL REFERENCES usuario(id_usuario)
);

CREATE TABLE estado_accion_correctiva (
    id_estado_accion SERIAL PRIMARY KEY,
    nombre_estado    VARCHAR(20) NOT NULL UNIQUE
        CHECK (nombre_estado IN ('Abierta', 'En Proceso', 'Cerrada', 'Vencida'))
);

CREATE TABLE accion_correctiva (
    id_accion                SERIAL PRIMARY KEY,
    codigo                    VARCHAR(20) NOT NULL UNIQUE,
    id_norma                  INTEGER NOT NULL REFERENCES norma(id_norma) ON DELETE CASCADE,
    id_articulo               INTEGER REFERENCES articulo_aplicable(id_articulo),
    articulo_relacionado_texto VARCHAR(200),
    descripcion               TEXT NOT NULL,
    id_estado_accion          INTEGER NOT NULL REFERENCES estado_accion_correctiva(id_estado_accion),
    nombre_responsable         VARCHAR(150),
    fecha_apertura             DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_compromiso           DATE NOT NULL,
    fecha_cierre               DATE,
    id_usuario_responsable     INTEGER REFERENCES usuario(id_usuario),
    id_usuario_registro        INTEGER NOT NULL REFERENCES usuario(id_usuario)
);

CREATE TABLE log_auditoria (
    id_log               BIGSERIAL PRIMARY KEY,
    id_usuario            INTEGER NOT NULL REFERENCES usuario(id_usuario),
    tipo_operacion         VARCHAR(20) NOT NULL
        CHECK (tipo_operacion IN ('CREACION', 'EDICION', 'ELIMINACION', 'EXPORTACION', 'CONSULTA', 'LOGIN', 'LOGOUT')),
    entidad_afectada       VARCHAR(50) NOT NULL,
    id_entidad_afectada    INTEGER,
    descripcion_registro   VARCHAR(300),
    detalle                JSONB,
    fecha_hora             TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_log_fecha ON log_auditoria (fecha_hora DESC);
CREATE INDEX idx_log_entidad ON log_auditoria (entidad_afectada);

-- Auditoría: índice por tipo + log inmutable (ver migrations/001)
-- Índice para el filtro por tipo de operación (RF-015: respuesta < 3 s).
CREATE INDEX IF NOT EXISTS idx_log_tipo ON log_auditoria (tipo_operacion, fecha_hora DESC);

-- Log inmutable (RF-014, regla de negocio): nadie puede editar ni borrar registros,
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


CREATE TABLE reporte_generado (
    id_reporte       SERIAL PRIMARY KEY,
    tipo_reporte      VARCHAR(60) NOT NULL,
    formato           VARCHAR(10) NOT NULL CHECK (formato IN ('XLSX', 'PDF')),
    fecha_desde       DATE,
    fecha_hasta       DATE,
    ruta_archivo      VARCHAR(500) NOT NULL,
    id_usuario        INTEGER NOT NULL REFERENCES usuario(id_usuario),
    fecha_generacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    filtros           JSONB,
    total_registros   INTEGER
);

INSERT INTO rol (nombre_rol) VALUES ('Profesional SST'), ('Administrador'), ('Auditor');
INSERT INTO estado_vigencia (nombre_estado) VALUES ('Vigente'), ('Derogada'), ('Modificada');
INSERT INTO estado_cumplimiento (nombre_estado) VALUES ('Cumple'), ('No Cumple'), ('En Proceso');
INSERT INTO estado_accion_correctiva (nombre_estado) VALUES ('Abierta'), ('En Proceso'), ('Cerrada'), ('Vencida');
INSERT INTO tipo_norma (nombre_tipo) VALUES ('Ley'), ('Decreto'), ('Resolución'), ('Circular'), ('Guía');
INSERT INTO frecuencia_seguimiento (nombre_frecuencia) VALUES ('Mensual'), ('Trimestral'), ('Anual');

-- Usuario de sistema
INSERT INTO usuario (nombre_usuario, nombre_completo, contrasena_hash, id_rol)
VALUES ('sistema', 'Usuario de Sistema NormaLAB',
        '$2b$12$D4vnD4aUGAbVC7toaoMqCO5aOL4V4PM.kwjsBOfeE0xtrqoj3uqEa',
        (SELECT id_rol FROM rol WHERE nombre_rol = 'Administrador'));
