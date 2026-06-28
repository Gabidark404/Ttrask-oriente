const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const { authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación (verifyJwt se aplica globalmente en index.js)

router.get('/', ctrl.getTools);
router.get('/dashboard', ctrl.getDashboardData);
router.get('/code/:code', ctrl.getToolByCode);
router.get('/:id', ctrl.getToolById);
router.post('/', authorize(['supervisor']), ctrl.createTool);
router.patch('/:id', authorize(['supervisor']), ctrl.updateTool);
router.delete('/:id', authorize(['supervisor']), ctrl.deleteTool);
router.patch('/:id/status', authorize(['supervisor']), ctrl.updateToolStatus);

module.exports = router;