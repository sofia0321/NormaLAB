const express = require('express');
const router = express.Router();

const catalogosController = require('../controllers/catalogosController');

router.get('/', catalogosController.obtenerCatalogos);

module.exports = router;
