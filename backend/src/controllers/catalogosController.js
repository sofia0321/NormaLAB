
const catalogoModel = require('../models/catalogoModel');

async function obtenerCatalogos(req, res, next) {
    try {
                const [tiposNorma, entidadesEmisoras, estadosVigencia] = await Promise.all([
            catalogoModel.listarTiposNorma(),
            catalogoModel.listarEntidadesEmisoras(),
            catalogoModel.listarEstadosVigencia(),
        ]);
        res.json({ tiposNorma, entidadesEmisoras, estadosVigencia });
    } catch (err) {
        next(err);
    }
}
module.exports = { obtenerCatalogos };
