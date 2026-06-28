const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');

// Todas requieren autenticación
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.patch('/:id/read', ctrl.markAsRead);

module.exports = router;