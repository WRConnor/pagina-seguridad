const db = require('../src/config/database');
const inicializarBaseDeDatos = require('./init-db');

/**
 * Script para eliminar usuarios de la base de datos relacional SQLite.
 *
 * Modos de uso:
 * 1. Eliminar TODOS los usuarios:
 *    node database/reset-users.js
 *
 * 2. Eliminar TODOS los usuarios y restablecer los 2 iniciales (admin y regular):
 *    node database/reset-users.js --reseed
 *
 * 3. Eliminar solo los usuarios registrados mediante la web, manteniendo los 2 por defecto:
 *    node database/reset-users.js --solo-registrados
 */
async function resetearUsuarios() {
  const args = process.argv.slice(2);
  const soloRegistrados = args.includes('--solo-registrados') || args.includes('--keep-defaults');
  const resembrar = args.includes('--reseed');

  if (soloRegistrados) {
    const stmt = db.prepare("DELETE FROM usuarios WHERE username NOT IN ('admin@seguridad.edu', 'usuario@seguridad.edu');");
    const resultado = stmt.run();
    console.log(`[OK] Se eliminaron ${resultado.changes} usuario(s) registrados. Se mantuvieron admin@seguridad.edu y usuario@seguridad.edu.`);
  } else {
    const stmt = db.prepare('DELETE FROM usuarios;');
    const resultado = stmt.run();
    console.log(`[OK] Se eliminaron ${resultado.changes} usuario(s) de la base de datos.`);

    if (resembrar) {
      console.log('[*] Restableciendo usuarios iniciales del laboratorio...');
      await inicializarBaseDeDatos();
    }
  }
}

if (require.main === module) {
  resetearUsuarios().catch((err) => {
    console.error('Error al resetear usuarios:', err);
    process.exit(1);
  });
}

module.exports = resetearUsuarios;
