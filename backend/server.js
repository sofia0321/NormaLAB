/**
 * server.js — punto de entrada del Backend.
 * Es el archivo que corre `npm start`. Su trabajo es solamente:
 *   1. Verificar que la base de datos externa responda (si no, avisa
 *      claramente el motivo y detiene el proceso, en vez de arrancar
 *      "a medias" y fallar en cada petición).
 *   2. Poner a Express (app.js) a escuchar peticiones en un puerto.
 */
require('dotenv').config();
const app = require('./src/app');
const { verificarConexion } = require('./src/models/db');

const PORT = process.env.PORT || 3000;

async function iniciar() {
    try {
        await verificarConexion();
        console.log('Conexión a la base de datos externa verificada correctamente.');
    } catch (err) {
        console.error('No fue posible conectar con la base de datos externa:', err.message);
        console.error('Revisa backend/.env (host, puerto, usuario, contraseña) y que el servidor '
            + 'PostgreSQL esté encendido y accesible.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`Backend de NormaLAB escuchando en http://localhost:${PORT}`);
    });
}

iniciar();
