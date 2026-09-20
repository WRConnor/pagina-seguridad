const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const db = require('../src/config/database');

const SALT_ROUNDS = 10; // Factor de costo recomendado en la Guía de Laboratorio

async function inicializarBaseDeDatos() {
  console.log('--- Inicializando Base de Datos Relacional (RBAC) ---');

  // 1. Ejecutar el script DDL de creación de tablas
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  console.log('[OK] Tablas roles y usuarios verificadas/creadas con éxito.');

  // 2. Generar hashes con BCrypt para usuarios iniciales (salt de 128 bits automático, costo 10)
  const hashAdmin = await bcrypt.hash('AdminPass2026!', SALT_ROUNDS);
  const hashUsuario = await bcrypt.hash('UsuarioPass2026!', SALT_ROUNDS);

  // 3. Preparar inserción de usuarios
  const stmtCheck = db.prepare('SELECT id FROM usuarios WHERE username = ?;');
  const stmtInsert = db.prepare(`
    INSERT INTO usuarios (username, password_hash, rol_id, intentos_fallidos, bloqueado_hasta)
    VALUES (?, ?, ?, 0, NULL);
  `);

  if (!stmtCheck.get('admin@seguridad.edu')) {
    stmtInsert.run('admin@seguridad.edu', hashAdmin, 1);
    console.log('[OK] Usuario administrador creado: admin@seguridad.edu (Rol: Administrador)');
  } else {
    console.log('[INFO] Usuario administrador ya existe.');
  }

  if (!stmtCheck.get('usuario@seguridad.edu')) {
    stmtInsert.run('usuario@seguridad.edu', hashUsuario, 2);
    console.log('[OK] Usuario regular creado: usuario@seguridad.edu (Rol: Usuario)');
  } else {
    console.log('[INFO] Usuario regular ya existe.');
  }

  console.log('--- Inicialización completada exitosamente ---');
}

if (require.main === module) {
  inicializarBaseDeDatos().catch((err) => {
    console.error('Error inicializando base de datos:', err);
    process.exit(1);
  });
}

module.exports = inicializarBaseDeDatos;
