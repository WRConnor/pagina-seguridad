const express = require('express');
const router = express.Router();
const { analizar, encriptar, healthCheck } = require('../controllers/crypto.controller');
const { requiereAutenticacion } = require('../middlewares/auth.middleware');

// Endpoint de monitoreo para Google Cloud
router.get('/health', healthCheck);

// Endpoints criptográficos protegidos por autenticación
router.post('/crypto/analyze', requiereAutenticacion, analizar);
router.post('/crypto/encrypt', requiereAutenticacion, encriptar);

module.exports = router;
