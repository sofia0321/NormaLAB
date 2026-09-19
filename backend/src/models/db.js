require('dotenv').config();
const { Pool } = require('pg');

const useSsl = String(process.env.NORMALAB_DB_SSL).toLowerCase() === 'true';

const pool = new Pool({
    host: process.env.NORMALAB_DB_HOST || 'localhost',
    port: Number(process.env.NORMALAB_DB_PORT) || 5432,
    database: process.env.NORMALAB_DB_NAME || 'Electiva',
    user: process.env.NORMALAB_DB_USER || 'Electiva',
    password: process.env.NORMALAB_DB_PASSWORD || '12345',
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

async function verificarConexion() {
    const cliente = await pool.connect();
    try {
        await cliente.query('SELECT 1');
    } finally {
        cliente.release();
    }
}

module.exports = { pool, verificarConexion };
