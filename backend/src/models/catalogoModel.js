
const { pool } = require('./db');
async function listarTiposNorma() {
    const { rows } = await pool.query(
        'SELECT id_tipo_norma, nombre_tipo FROM tipo_norma ORDER BY nombre_tipo'
    );
    return rows;
}

async function listarEntidadesEmisoras() {
    const { rows } = await pool.query(
        'SELECT id_entidad, nombre FROM entidad_emisora ORDER BY nombre'
    );
    return rows;
}

async function listarEstadosVigencia() {
    const { rows } = await pool.query(
        'SELECT id_estado_vigencia, nombre_estado FROM estado_vigencia ORDER BY id_estado_vigencia'
    );
    return rows;
}
async function obtenerOCrearEntidadEmisora(nombre) {
    const nombreLimpio = String(nombre || '').trim();
    if (!nombreLimpio) return null;

    const existente = await pool.query(
        'SELECT id_entidad FROM entidad_emisora WHERE LOWER(nombre) = LOWER($1)',
        [nombreLimpio]
    );
    if (existente.rows.length > 0) {
        return existente.rows[0].id_entidad;
    }

    const creado = await pool.query(
        'INSERT INTO entidad_emisora (nombre) VALUES ($1) RETURNING id_entidad',
        [nombreLimpio]
    );
    return creado.rows[0].id_entidad;
}

module.exports = {
    listarTiposNorma,
    listarEntidadesEmisoras,
    listarEstadosVigencia,
    obtenerOCrearEntidadEmisora,
};
