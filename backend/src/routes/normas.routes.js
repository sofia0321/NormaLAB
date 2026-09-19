const express = require('express');
const router = express.Router();

const normasController = require('../controllers/normasController');

router.get('/', normasController.listarNormas);
router.get('/:id', normasController.obtenerNorma);

router.post('/', normasController.crearNorma);
router.put('/:id', normasController.actualizarNorma);

router.delete('/:id', normasController.eliminarNorma);

module.exports = router;
