const http = require('node:http');
const app = require('../src/app');
const db = require('../src/config/database');
const inicializarBaseDeDatos = require('../database/init-db');
const { limpiarRegistroIP } = require('../src/middlewares/bruteForce.middleware');

function request(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const reqOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path: options.path || '/',
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function ejecutarPruebas() {
  console.log('====================================================================');
  console.log('  INICIANDO SUITE DE PRUEBAS DE SEGURIDAD Y FUERZA BRUTA');
  console.log('====================================================================\n');

  await inicializarBaseDeDatos();

  // Resetear estado del usuario de prueba para garantizar idempotencia en la suite de pruebas
  db.prepare("UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE username = 'usuario@seguridad.edu';").run();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[TEST] Servidor de prueba escuchando en puerto efímero :${port}\n`);

  try {
    // 1. Probar Endpoint de Salud (Health Check)
    console.log('[TEST 1] Verificando GET /api/health ...');
    const resHealth = await request(server, { path: '/api/health', method: 'GET' });
    console.log(` -> Status: ${resHealth.status}`);
    console.log(` -> Body:`, resHealth.data);
    if (resHealth.status !== 200 || resHealth.data.status !== 'healthy') {
      throw new Error('Fallo en endpoint /api/health');
    }
    console.log(' -> [PASÓ] Endpoint de salud operativo.\n');

    // 2. Probar acceso denegado a crypto sin sesión
    console.log('[TEST 2] Verificando protección de ruta /api/crypto/analyze sin sesión ...');
    const resProtected = await request(
      server,
      {
        path: '/api/crypto/analyze',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      },
      { criptograma: 'QXJERÑQRSJHYAÑTQÑKXZPABEMDCLSQÑVQTRÑYLKJQXVÑTQÑAMSTU' }
    );
    console.log(` -> Status: ${resProtected.status}`);
    console.log(` -> Error:`, resProtected.data);
    if (resProtected.status !== 401) {
      throw new Error(`Esperaba 401 pero obtuve ${resProtected.status}`);
    }
    console.log(' -> [PASÓ] Rutas criptográficas correctamente protegidas.\n');

    // 3. Probar autenticación exitosa con credenciales válidas
    console.log('[TEST 3] Autenticación válida con admin@seguridad.edu / AdminPass2026! ...');
    const resLoginValido = await request(
      server,
      {
        path: '/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      },
      { username: 'admin@seguridad.edu', password: 'AdminPass2026!' }
    );
    console.log(` -> Status: ${resLoginValido.status}`);
    console.log(` -> Body:`, resLoginValido.data);
    const cookie = resLoginValido.headers['set-cookie'];
    if (resLoginValido.status !== 200 || !cookie) {
      throw new Error('Fallo en login válido');
    }
    console.log(' -> [PASÓ] Login exitoso y cookie de sesión generada.\n');

    // 4. Probar criptoanálisis con sesión autenticada
    console.log('[TEST 4] Criptoanálisis con sesión activa ...');
    const resAnalyze = await request(
      server,
      {
        path: '/api/crypto/analyze',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Cookie: cookie.map((c) => c.split(';')[0]).join('; '),
        },
      },
      { criptograma: 'QXJERÑQRSJHYAÑTQÑKXZPABEMDCLSQÑVQTRÑYLKJQXVÑTQÑAMSTU' }
    );
    console.log(` -> Status: ${resAnalyze.status}`);
    console.log(` -> Método ganador:`, resAnalyze.data.data.resultadoMetodo.metodoGanador);
    console.log(` -> Texto descifrado:`, resAnalyze.data.data.resultadoMetodo.textoDescifrado);
    if (resAnalyze.status !== 200) {
      throw new Error('Fallo en análisis con sesión activa');
    }
    console.log(' -> [PASÓ] Criptoanálisis ejecutado correctamente desde el backend.\n');

    // 5. PRUEBA DEMOSTRATIVA DE MITIGACIÓN DE FUERZA BRUTA (REQUERIMIENTO DEL PDF)
    console.log('====================================================================');
    console.log(' [TEST 5] PRUEBA DEMOSTRATIVA DE FUERZA BRUTA (5 INTENTOS FALLIDOS)');
    console.log('====================================================================');
    limpiarRegistroIP('127.0.0.1');

    for (let intento = 1; intento <= 6; intento += 1) {
      console.log(`\n>>> Disparando Intento Fallido #${intento}...`);
      const resIntento = await request(
        server,
        {
          path: '/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        },
        { username: 'usuario@seguridad.edu', password: `PasswordErroneo_${intento}!` }
      );

      console.log(`    Código HTTP devuelto: ${resIntento.status}`);
      console.log(`    Respuesta del servidor:`, resIntento.data);

      if (intento < 5) {
        if (resIntento.status !== 401) {
          throw new Error(`Intento ${intento} debió devolver 401 pero devolvió ${resIntento.status}`);
        }
      } else if (intento === 5) {
        // En el 5to intento fallido se activa el bloqueo
        console.log('    [ALERTA] Umbral de 5 intentos fallidos alcanzado.');
      } else if (intento === 6) {
        // En el 6to intento consecutivo el middleware debe rechazar con HTTP 429
        if (resIntento.status !== 429) {
          throw new Error(`Intento 6 debió devolver 429 Too Many Requests pero devolvió ${resIntento.status}`);
        }
        console.log('    [EXITO DEMOSTRATIVO] El middleware perimetral bloqueó la IP con código HTTP 429.');
      }
    }

    // 6. Verificar persistencia de intentos fallidos en la base de datos
    console.log('\n[TEST 6] Verificando estado de la cuenta en la Base de Datos Relacional...');
    const stmtCheckUser = db.prepare('SELECT username, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE username = ?;');
    const estadoDB = stmtCheckUser.get('usuario@seguridad.edu');
    console.log(' -> Registro en BD:', estadoDB);
    if (estadoDB.intentos_fallidos < 5 || !estadoDB.bloqueado_hasta) {
      throw new Error('La base de datos no registró el bloqueo del usuario');
    }
    console.log(' -> [PASÓ] Bloqueo registrado correctamente en base de datos.\n');

    // 7. Probar Registro de Nuevo Usuario con BCrypt y posterior Login
    console.log('====================================================================');
    console.log(' [TEST 7] PRUEBA DE REGISTRO DE NUEVO USUARIO (BCRYPT + LOGIN)');
    console.log('====================================================================');
    const nuevoEmail = `nuevo_estudiante_${Date.now()}@seguridad.edu`;
    const nuevoPassword = 'MiPasswordSeguro2026!';

    console.log(`>>> Registrando nuevo usuario: ${nuevoEmail} ...`);
    const resRegistro = await request(
      server,
      {
        path: '/registro',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      },
      { username: nuevoEmail, password: nuevoPassword, confirmPassword: nuevoPassword }
    );
    console.log(` -> Status: ${resRegistro.status}`);
    console.log(` -> Body:`, resRegistro.data);
    if (resRegistro.status !== 201 || !resRegistro.data.exitoso) {
      throw new Error('Fallo en el registro de usuario');
    }

    // Verificar en BD que el hash fue generado con BCrypt ($2b$10$)
    const stmtNuevo = db.prepare('SELECT id, username, password_hash, rol_id FROM usuarios WHERE username = ?;');
    const usuarioBD = stmtNuevo.get(nuevoEmail);
    console.log(' -> Registro en BD del nuevo usuario:', {
      id: usuarioBD.id,
      username: usuarioBD.username,
      hashPrefijo: usuarioBD.password_hash.substring(0, 7),
      hashLongitud: usuarioBD.password_hash.length,
      rol_id: usuarioBD.rol_id,
    });

    if (!usuarioBD.password_hash.startsWith('$2a$10$') && !usuarioBD.password_hash.startsWith('$2b$10$')) {
      throw new Error('El hash no cumple con la especificación BCrypt costo 10 ($2a$10$ o $2b$10$)');
    }
    console.log(' -> [PASÓ] Contraseña del nuevo usuario hasheada con BCrypt costo 10.');

    // Limpiar IP bloqueada de pruebas anteriores para probar login con el nuevo usuario
    limpiarRegistroIP('127.0.0.1');

    console.log(`>>> Probando login con las credenciales del nuevo usuario recién registrado...`);
    const resLoginNuevo = await request(
      server,
      {
        path: '/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      },
      { username: nuevoEmail, password: nuevoPassword }
    );
    console.log(` -> Status: ${resLoginNuevo.status}`);
    console.log(` -> Body:`, resLoginNuevo.data);
    if (resLoginNuevo.status !== 200 || !resLoginNuevo.data.exitoso) {
      throw new Error('Fallo al iniciar sesión con el nuevo usuario registrado');
    }
    console.log(' -> [PASÓ] Nuevo usuario autenticado exitosamente con su contraseña hasheada.\n');

    console.log('====================================================================');
    console.log('  ¡TODAS LAS PRUEBAS (SEGURIDAD, FUERZA BRUTA Y REGISTRO) HAN PASADO!');
    console.log('====================================================================');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((err) => {
    console.error('Error fatal durante la prueba:', err);
    process.exit(1);
  });
}

module.exports = ejecutarPruebas;
