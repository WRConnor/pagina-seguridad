const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const cryptoRoutes = require('./routes/crypto.routes');
const { requiereAutenticacion } = require('./middlewares/auth.middleware');

const app = express();

// 1. Cabeceras HTTP de seguridad con Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        upgradeInsecureRequests: null, // Evita forzar HTTPS en subrecursos cuando se prueba en HTTP (Fase 1)
      },
    },
    crossOriginOpenerPolicy: false, // Evita advertencias de origen no confiable en HTTP o IP directa
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
    hsts: false, // Nginx se encarga del HSTS y de la terminación TLS
  })
);

// 2. Procesamiento de cuerpos de petición
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 3. Manejo de sesiones seguras mediante cookies HttpOnly
app.use(
  cookieSession({
    name: 'crypto_session',
    keys: [process.env.SESSION_SECRET || 'clave_secreta_universidad_el_bosque_2026'],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
  })
);

// 4. Recursos estáticos públicos (CSS, JS cliente)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));

// 5. Rutas de autenticación (Login, Logout, etc.)
app.use('/', authRoutes);

// 6. Rutas de la API (/api/crypto, /api/health)
app.use('/api', cryptoRoutes);

// 7. Páginas protegidas de cifrado clásico (Requieren sesión iniciada)
app.get('/', requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/index.html', requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/encriptar.html', requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/encriptar.html'));
});

// 8. Manejo de rutas no encontradas (404)
app.use((req, res) => {
  if (req.accepts('json') || req.xhr) {
    return res.status(404).json({ error: 'Recurso no encontrado' });
  }
  // Si la petición es un archivo de recursos (.css, .js, .ico, etc.), devolver 404 y no redirigir a HTML
  if (/\.(css|js|ico|png|jpg|jpeg|svg|woff2?|ttf|map)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send('Recurso no encontrado');
  }
  return res.redirect('/');
});

// 9. Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Error interno en el servidor.' });
});

module.exports = app;
