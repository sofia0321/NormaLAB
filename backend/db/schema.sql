CREATE TABLE IF NOT EXISTS tipo_norma (
    id_tipo_norma  SERIAL PRIMARY KEY,   -- id autoincremental (clave primaria)
    nombre_tipo    VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS entidad_emisora (
    id_entidad  SERIAL PRIMARY KEY,
    nombre      VARCHAR(250) NOT NULL UNIQUE
);

-- Estado de vigencia de la norma: si sigue aplicando o no.
CREATE TABLE IF NOT EXISTS estado_vigencia (
    id_estado_vigencia  SERIAL PRIMARY KEY,
    nombre_estado       VARCHAR(20) NOT NULL UNIQUE
        CHECK (nombre_estado IN ('Vigente', 'Derogada', 'Modificada'))
);

-- ---------------------------------------------------------------------
-- 2. NORMAS LEGALES (la tabla principal del módulo, "la matriz legal")
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS norma (
    id_norma             SERIAL PRIMARY KEY,

    -- Relaciones con los catálogos de arriba (llaves foráneas / FOREIGN KEY):
    -- garantizan que solo se pueda guardar un id_tipo_norma que SÍ exista
    -- en la tabla tipo_norma, por ejemplo.
    id_tipo_norma        INTEGER NOT NULL REFERENCES tipo_norma(id_tipo_norma),
    id_entidad_emisora   INTEGER NOT NULL REFERENCES entidad_emisora(id_entidad),
    id_estado_vigencia   INTEGER NOT NULL REFERENCES estado_vigencia(id_estado_vigencia),

    -- Datos propios de la norma:
    numero               VARCHAR(30)  NOT NULL,          -- ej: "0312"
    anio                 INTEGER      NOT NULL CHECK (anio >= 1900),
    titulo               VARCHAR(400) NOT NULL,          -- ej: "Resolución 0312 de 2019"
    descripcion          TEXT,                            -- texto libre, puede ir vacío
    exigencia_legal      TEXT,                            -- qué exige cumplir la norma
    fecha_vigencia        DATE,
    responsable_cargo     VARCHAR(200),                    -- quién responde por esta norma

    fecha_registro        TIMESTAMP NOT NULL DEFAULT NOW(), -- se llena sola al crear el registro

    -- No puede repetirse la misma combinación tipo+número+año
    -- (evita registrar la "Resolución 0312 de 2019" dos veces).
    UNIQUE (id_tipo_norma, numero, anio)
);

-- =====================================================================
-- Datos de referencia (catálogos) — se insertan solo si no existen
-- ON CONFLICT ... DO NOTHING evita error si vuelves a correr el script.
-- =====================================================================
INSERT INTO estado_vigencia (nombre_estado)
    VALUES ('Vigente'), ('Derogada'), ('Modificada')
    ON CONFLICT (nombre_estado) DO NOTHING;

INSERT INTO tipo_norma (nombre_tipo)
    VALUES ('Ley'), ('Decreto'), ('Resolución'), ('Circular'), ('Guía')
    ON CONFLICT (nombre_tipo) DO NOTHING;

-- Un par de datos de ejemplo para poder probar la app apenas se instala.
-- Se pueden editar o borrar desde la propia aplicación sin problema.
INSERT INTO entidad_emisora (nombre)
    VALUES ('Ministerio del Trabajo'), ('Congreso de Colombia')
    ON CONFLICT (nombre) DO NOTHING;

INSERT INTO norma (id_tipo_norma, numero, anio, id_entidad_emisora, titulo, descripcion,
                    exigencia_legal, id_estado_vigencia, fecha_vigencia, responsable_cargo)
SELECT
    (SELECT id_tipo_norma FROM tipo_norma WHERE nombre_tipo = 'Resolución'),
    '0312', 2019,
    (SELECT id_entidad FROM entidad_emisora WHERE nombre = 'Ministerio del Trabajo'),
    'Resolución 0312 de 2019',
    'Estándares mínimos del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).',
    'Implementar y mantener el SG-SST conforme a los estándares mínimos.',
    (SELECT id_estado_vigencia FROM estado_vigencia WHERE nombre_estado = 'Vigente'),
    '2019-02-13',
    'Coordinador SST'
WHERE NOT EXISTS (
    SELECT 1 FROM norma WHERE numero = '0312' AND anio = 2019
);
