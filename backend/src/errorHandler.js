function errorHandler(err, req, res, _next) {
    console.error('Error en la petición:', err);

    // Errores típicos de PostgreSQL que conviene traducir a un mensaje claro.
    if (err && err.code === '23505') {
        return res.status(409).json({ mensaje: 'Ya existe un registro con esos datos (violación de unicidad).' });
    }
    if (err && err.code === '23503') {
        return res.status(409).json({ mensaje: 'La operación viola una relación con otra tabla (llave foránea).' });
    }
    if (err && err.code === '42501') {
        // "permission denied for table ...": el usuario de la BD no es
        // dueño de las tablas ni tiene permisos otorgados con GRANT.
        return res.status(500).json({
            mensaje: 'El usuario de la base de datos no tiene permisos sobre las tablas. '
                + 'Ejecuta en tu base de datos: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tu_usuario;',
        });
    }
    if (err && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) {
        return res.status(503).json({
            mensaje: 'No fue posible conectarse a la base de datos externa. Verifica que el servidor '
                + 'PostgreSQL esté disponible y revisa backend/.env.',
        });
    }

    res.status(500).json({ mensaje: 'Error interno del servidor', detalle: err.message });
}

module.exports = errorHandler;
