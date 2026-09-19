
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const normasRoutes = require('./routes/normas.routes');
const catalogosRoutes = require('./routes/catalogos.routes');
const errorHandler = require('./errorHandler');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));


app.use(express.json());


app.get('/api/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'normalab-backend' });
});


app.use('/api/normas', normasRoutes);
app.use('/api/catalogos', catalogosRoutes);


app.use((req, res) => {
    res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});


app.use(errorHandler);

module.exports = app;
