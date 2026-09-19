const { pool } = require('./db');

const SELECT_BASE = `
    SELECT n.id_norma, n.id_tipo_norma, n.numero, n.anio, n.id_entidad_emisora,
           n.titulo, n.descripcion, n.exigencia_legal, n.id_estado_vigencia,
           n.fecha_vigencia, n.responsable_cargo, n.fecha_registro,
           t.nombre_tipo     AS nombre_tipo_norma,
           e.nombre          AS nombre_entidad_emisora,
           v.nombre_estado   AS nombre_estado_vigencia
    FROM norma n
    JOIN tipo_norma t       ON t.id_tipo_norma      = n.id_tipo_norma
    JOIN entidad_emisora e  ON e.id_entidad         = n.id_entidad_emisora
    JOIN estado_vigencia v  ON v.id_estado_vigencia = n.id_estado_vigencia
`;

async function listar({ texto, idEstadoVigencia, idTipoNorma } = {}) {
    const condiciones = [];
    const parametros = [];

    if (texto) {
        parametros.push(`%${texto}%`); 
        const p = parametros.length;
        condiciones.push(`(n.titulo ILIKE $${p} OR n.numero ILIKE $${p} OR e.nombre ILIKE $${p})`);
    }
    if (idEstadoVigencia) {
        parametros.push(idEstadoVigencia);
        condiciones.push(`n.id_estado_vigencia = $${parametros.length}`);
    }
    if (idTipoNorma) {
        parametros.push(idTipoNorma);
        condiciones.push(`n.id_tipo_norma = $${parametros.length}`);
    }

    let sql = SELECT_BASE;
    if (condiciones.length > 0) {
        sql += ' WHERE ' + condiciones.join(' AND ');
    }
    sql += ' ORDER BY n.fecha_registro DESC'; 

    const { rows } = await pool.query(sql, parametros);
    return rows;
}

async function obtenerPorId(idNorma) {
    const { rows } = await pool.query(SELECT_BASE + ' WHERE n.id_norma = $1', [idNorma]);
    return rows[0] || null; 
}

async function crear(datos) {
    const {
        idTipoNorma, numero, anio, idEntidadEmisora, titulo,
        descripcion, exigenciaLegal, idEstadoVigencia, fechaVigencia, responsableCargo,
    } = datos;

    const { rows } = await pool.query(
        `INSERT INTO norma
            (id_tipo_norma, numero, anio, id_entidad_emisora, titulo,
             descripcion, exigencia_legal, id_estado_vigencia, fecha_vigencia, responsable_cargo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id_norma`,
        [idTipoNorma, numero, anio, idEntidadEmisora, titulo,
            descripcion || null, exigenciaLegal || null, idEstadoVigencia,
            fechaVigencia || null, responsableCargo || null]
    );
    return obtenerPorId(rows[0].id_norma);
}

async function actualizar(idNorma, datos) {
    const {
        idTipoNorma, numero, anio, idEntidadEmisora, titulo,
        descripcion, exigenciaLegal, idEstadoVigencia, fechaVigencia, responsableCargo,
    } = datos;

    const { rowCount } = await pool.query(
        `UPDATE norma SET
            id_tipo_norma = $1, numero = $2, anio = $3, id_entidad_emisora = $4,
            titulo = $5, descripcion = $6, exigencia_legal = $7,
            id_estado_vigencia = $8, fecha_vigencia = $9, responsable_cargo = $10
         WHERE id_norma = $11`,
        [idTipoNorma, numero, anio, idEntidadEmisora, titulo,
            descripcion || null, exigenciaLegal || null, idEstadoVigencia,
            fechaVigencia || null, responsableCargo || null, idNorma]
    );

    if (rowCount === 0) return null;
    return obtenerPorId(idNorma);
}

async function eliminar(idNorma) {
    const { rowCount } = await pool.query('DELETE FROM norma WHERE id_norma = $1', [idNorma]);
    return rowCount > 0;
}

module.exports = {
    listar,
    obtenerPorId,
    crear,
    actualizar,
    eliminar,
};
