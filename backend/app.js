const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------
// Conexión a SQLite y creación de la tabla si no existe
// ----------------------------
const db = new Database('normas.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS normas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        estado TEXT NOT NULL
    )
`);

// Semilla inicial (solo si la tabla está vacía)
const total = db.prepare('SELECT COUNT(*) as total FROM normas').get().total;
if (total === 0) {
    const insert = db.prepare('INSERT INTO normas (nombre, descripcion, estado) VALUES (?, ?, ?)');
    insert.run('Resolución 0312', 'Estándares mínimos de SG-SST', 'Cumple');
    insert.run('Decreto 1072', 'Decreto único del sector trabajo', 'En proceso');
}

// ----------------------------
// Validación reutilizable para POST y PUT
// ----------------------------
function validarNorma(req, res, next) {
    const { nombre, estado } = req.body;

    if (!nombre || !estado) {
        return res.status(400).json({ mensaje: 'Faltan datos: nombre y estado son obligatorios' });
    }

    next();
}

// ----------------------------
// GET: listar normas
// ----------------------------
app.get('/normas', (req, res) => {
    const normas = db.prepare('SELECT * FROM normas').all();
    res.json(normas);
});

// ----------------------------
// GET personalizado (mismo patrón que /hello/:nombre)
// ----------------------------
app.get('/estado/:nombreNorma', (req, res) => {
    const { nombreNorma } = req.params;
    const norma = db.prepare('SELECT * FROM normas WHERE nombre = ?').get(nombreNorma);

    if (!norma) {
        return res.status(404).send(`No se encontró la norma "${nombreNorma}"`);
    }

    res.send(`La norma "${norma.nombre}" está en estado: ${norma.estado}`);
});

// ----------------------------
// POST: agregar una nueva norma
// ----------------------------
app.post('/normas', validarNorma, (req, res) => {
    const { nombre, descripcion, estado } = req.body;
    const insert = db.prepare('INSERT INTO normas (nombre, descripcion, estado) VALUES (?, ?, ?)');
    const info = insert.run(nombre, descripcion, estado);
    const nuevaNorma = db.prepare('SELECT * FROM normas WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(nuevaNorma);
});

// ----------------------------
// PUT: modificar una norma por id
// ----------------------------
app.put('/normas/:id', validarNorma, (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;

    const existente = db.prepare('SELECT * FROM normas WHERE id = ?').get(id);
    if (!existente) {
        return res.status(404).json({ mensaje: 'Norma no encontrada' });
    }

    db.prepare('UPDATE normas SET nombre = ?, descripcion = ?, estado = ? WHERE id = ?').run(nombre, descripcion, estado, id);
    const actualizada = db.prepare('SELECT * FROM normas WHERE id = ?').get(id);
    res.json(actualizada);
});

// ----------------------------
// DELETE: eliminar una norma por id
// ----------------------------
app.delete('/normas/:id', (req, res) => {
    const { id } = req.params;

    const existente = db.prepare('SELECT * FROM normas WHERE id = ?').get(id);
    if (!existente) {
        return res.status(404).json({ mensaje: 'Norma no encontrada' });
    }

    db.prepare('DELETE FROM normas WHERE id = ?').run(id);
    res.json({ mensaje: 'Norma eliminada', norma: existente });
});

app.listen(3000, () => {
    console.log('El servidor está escuchando en el puerto 3000');
});
