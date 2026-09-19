const normaModel = require('../models/normaModel');
const catalogoModel = require('../models/catalogoModel');

function validarDatosNorma(body) {
    const { numero, anio, titulo, idTipoNorma, idEstadoVigencia, idEntidadEmisora, nombreEntidadEmisora } = body;
    const errores = [];

    if (!numero || !String(numero).trim()) errores.push('El número de la norma es obligatorio.');
    if (!anio || Number.isNaN(Number(anio))) errores.push('El año de la norma es obligatorio y debe ser numérico.');
    if (anio && (Number(anio) < 1900 || Number(anio) > 2100)) errores.push('El año debe estar entre 1900 y 2100.');
    if (!titulo || !String(titulo).trim()) errores.push('El título de la norma es obligatorio.');
    if (!idTipoNorma) errores.push('El tipo de norma es obligatorio.');
    if (!idEstadoVigencia) errores.push('El estado de vigencia es obligatorio.');
    if (!idEntidadEmisora && !(nombreEntidadEmisora && String(nombreEntidadEmisora).trim())) {
        errores.push('La entidad emisora es obligatoria.');
    }
    return errores;
}

function mapNorma(row) {
    if (!row) return null;
    return {
        idNorma: row.id_norma,
        idTipoNorma: row.id_tipo_norma,
        numero: row.numero,
        anio: row.anio,
        idEntidadEmisora: row.id_entidad_emisora,
        titulo: row.titulo,
        descripcion: row.descripcion,
        exigenciaLegal: row.exigencia_legal,
        idEstadoVigencia: row.id_estado_vigencia,
        fechaVigencia: row.fecha_vigencia,
        responsableCargo: row.responsable_cargo,
        fechaRegistro: row.fecha_registro,
        nombreTipoNorma: row.nombre_tipo_norma,
        nombreEntidadEmisora: row.nombre_entidad_emisora,
        nombreEstadoVigencia: row.nombre_estado_vigencia,
    };
}

async function listarNormas(req, res, next) {
    try {
        const { texto, idEstadoVigencia, idTipoNorma } = req.query;
        const rows = await normaModel.listar({
            texto,
            idEstadoVigencia: idEstadoVigencia ? Number(idEstadoVigencia) : undefined,
            idTipoNorma: idTipoNorma ? Number(idTipoNorma) : undefined,
        });
        res.json(rows.map(mapNorma));
    } catch (err) {
        next(err); 
    }
}

async function obtenerNorma(req, res, next) {
    try {
        const norma = await normaModel.obtenerPorId(Number(req.params.id));
        if (!norma) return res.status(404).json({ mensaje: 'Norma no encontrada' });
        res.json(mapNorma(norma));
    } catch (err) {
        next(err);
    }
}

async function resolverEntidadEmisora(body) {
    if (body.idEntidadEmisora) return Number(body.idEntidadEmisora);
    if (body.nombreEntidadEmisora) {
        return catalogoModel.obtenerOCrearEntidadEmisora(body.nombreEntidadEmisora);
    }
    return null;
}

async function crearNorma(req, res, next) {
    const errores = validarDatosNorma(req.body);
    if (errores.length > 0) {
        return res.status(400).json({ mensaje: 'Datos inválidos', errores });
    }
    try {
        const idEntidadEmisora = await resolverEntidadEmisora(req.body);
        const creada = await normaModel.crear({
            idTipoNorma: Number(req.body.idTipoNorma),
            numero: req.body.numero,
            anio: Number(req.body.anio),
            idEntidadEmisora,
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            exigenciaLegal: req.body.exigenciaLegal,
            idEstadoVigencia: Number(req.body.idEstadoVigencia),
            fechaVigencia: req.body.fechaVigencia || null,
            responsableCargo: req.body.responsableCargo,
        });
                res.status(201).json(mapNorma(creada));
    } catch (err) {
        next(err);
    }
}

async function actualizarNorma(req, res, next) {
    const errores = validarDatosNorma(req.body);
    if (errores.length > 0) {
        return res.status(400).json({ mensaje: 'Datos inválidos', errores });
    }
    try {
        const idEntidadEmisora = await resolverEntidadEmisora(req.body);
        const actualizada = await normaModel.actualizar(Number(req.params.id), {
            idTipoNorma: Number(req.body.idTipoNorma),
            numero: req.body.numero,
            anio: Number(req.body.anio),
            idEntidadEmisora,
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            exigenciaLegal: req.body.exigenciaLegal,
            idEstadoVigencia: Number(req.body.idEstadoVigencia),
            fechaVigencia: req.body.fechaVigencia || null,
            responsableCargo: req.body.responsableCargo,
        });
        if (!actualizada) return res.status(404).json({ mensaje: 'Norma no encontrada' });
        res.json(mapNorma(actualizada));
    } catch (err) {
        next(err);
    }
}

async function eliminarNorma(req, res, next) {
    try {
        const eliminada = await normaModel.eliminar(Number(req.params.id));
        if (!eliminada) return res.status(404).json({ mensaje: 'Norma no encontrada' });
        res.json({ mensaje: 'Norma eliminada correctamente' });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    mapNorma,
    listarNormas,
    obtenerNorma,
    crearNorma,
    actualizarNorma,
    eliminarNorma,
};
