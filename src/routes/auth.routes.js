const express = require('express');
const router = express.Router();
const {
  mostrarFormularioLogin,
  mostrarFormularioRegistro,
  procesarLogin,
  procesarLogout,
  procesarRegistro,
  obtenerUsuarioActual,
} = require('../controllers/auth.controller');
const { middlewareProteccionFuerzaBruta } = require('../middlewares/bruteForce.middleware');

// Rutas del Formulario de Login (Sección 1.2 del Laboratorio)
router.get('/login', mostrarFormularioLogin);
router.post('/login', middlewareProteccionFuerzaBruta, procesarLogin);

// Rutas de Registro de Usuario
router.get('/registro', mostrarFormularioRegistro);
router.post('/registro', procesarRegistro);

// Logout
router.get('/logout', procesarLogout);
router.post('/logout', procesarLogout);

// API Endpoints de soporte
router.get('/api/auth/me', obtenerUsuarioActual);
router.post('/api/auth/registro', procesarRegistro);

module.exports = router;
