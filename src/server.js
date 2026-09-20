const http = require('node:http');
const app = require('./app');
const inicializarBaseDeDatos = require('../database/init-db');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    // Asegurar que la base de datos relacional y las tablas existan al iniciar
    await inicializarBaseDeDatos();

    const server = http.createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(` Servidor seguro iniciado en http://localhost:${PORT}`);
      console.log(` Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Hashing BCrypt y Protección contra Fuerza Bruta: ACTIVOS`);
      console.log(`=======================================================`);
    });

    const shutdown = () => {
      console.log('\n[INFO] Cerrando servidor de forma segura...');
      server.close(() => {
        console.log('[OK] Servidor cerrado.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

iniciarServidor();
