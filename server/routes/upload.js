const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/uploadController');
const { authorize } = require('../middleware/auth');

// Solo supervisores pueden importar Excel (o técnicos si se prefiere)
router.post('/', authorize(['supervisor']), ctrl.importExcel);

module.exports = router;