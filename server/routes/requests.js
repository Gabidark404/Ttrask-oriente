const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/requestController');
const { authorize } = require('../middleware/auth');

// Todas requieren autenticación

// Técnicos y supervisores pueden ver y crear solicitudes
router.get('/', ctrl.getRequests);
router.get('/:id', ctrl.getRequestById);
router.post('/', ctrl.createRequest);

// Solo supervisores pueden aprobar/rechazar
router.patch('/:id', authorize(['supervisor']), ctrl.updateRequestStatus);

module.exports = router;