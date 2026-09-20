const bcrypt = require('bcryptjs');
const db = require('../config/database');

const SALT_ROUNDS = 10; // Factor de trabajo de 10 rondas (2^10 iteraciones) según la Guía de Laboratorio
const MINUTOS_BLOQUEO = 15;

async function registrarUsuario(username, passwordPlano, rolId = 2) {
  if (!username || !passwordPlano) {
    throw new Error('Usuario y contraseña son requeridos.');
  }

  const stmtCheck = db.prepare('SELECT id FROM usuarios WHERE username = ?;');
  const existente = stmtCheck.get(username);
  if (existente) {
    throw new Error('El nombre de usuario o correo ya se encuentra registrado.');
  }

  // Generación del hash con salt automático de 128 bits
  const passwordHash = await bcrypt.hash(passwordPlano, SALT_ROUNDS);

  const stmtInsert = db.prepare(`
    INSERT INTO usuarios (username, password_hash, rol_id, intentos_fallidos, bloqueado_hasta)
    VALUES (?, ?, ?, 0, NULL);
  `);
  const resultado = stmtInsert.run(username, passwordHash, rolId);

  return {
    id: resultado.lastInsertRowid,
    username,
    rolId,
  };
}

async function verificarCredenciales(username, passwordIngresado) {
  const stmtUser = db.prepare(`
    SELECT u.id, u.username, u.password_hash, u.rol_id, u.intentos_fallidos, u.bloqueado_hasta, r.nombre as rol_nombre
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.username = ?;
  `);
  const usuario = stmtUser.get(username);

  const ahora = new Date();

  if (!usuario) {
    return {
      valido: false,
      bloqueado: false,
      error: 'Credenciales inválidas.',
    };
  }

  // Verificar si el usuario se encuentra temporalmente bloqueado en base de datos
  if (usuario.bloqueado_hasta) {
    const tiempoBloqueo = new Date(usuario.bloqueado_hasta);
    if (tiempoBloqueo > ahora) {
      const segundosRestantes = Math.ceil((tiempoBloqueo.getTime() - ahora.getTime()) / 1000);
      return {
        valido: false,
        bloqueado: true,
        segundosRestantes,
        error: `Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente de nuevo en ${segundosRestantes} segundos.`,
      };
    }
  }

  // Comprobar contraseña usando bcrypt.compare (compara con el salt embebido en password_hash)
  const coincide = await bcrypt.compare(passwordIngresado, usuario.password_hash);

  if (!coincide) {
    const nuevosIntentos = (usuario.intentos_fallidos || 0) + 1;
    let fechaBloqueo = null;
    let cuentaBloqueada = false;
    let segundosRestantes = 0;

    if (nuevosIntentos >= 5) {
      cuentaBloqueada = true;
      const bloqueoHasta = new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60 * 1000);
      fechaBloqueo = bloqueoHasta.toISOString();
      segundosRestantes = MINUTOS_BLOQUEO * 60;
    }

    const stmtUpdateFallo = db.prepare(`
      UPDATE usuarios
      SET intentos_fallidos = ?, bloqueado_hasta = ?
      WHERE id = ?;
    `);
    stmtUpdateFallo.run(nuevosIntentos, fechaBloqueo, usuario.id);

    return {
      valido: false,
      bloqueado: cuentaBloqueada,
      intentosRestantes: Math.max(0, 5 - nuevosIntentos),
      segundosRestantes,
      error: cuentaBloqueada
        ? `Ha alcanzado el límite de 5 intentos fallidos. Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos.`
        : 'Credenciales inválidas.',
    };
  }

  // Restablecer contador de intentos en login exitoso
  const stmtReset = db.prepare(`
    UPDATE usuarios
    SET intentos_fallidos = 0, bloqueado_hasta = NULL
    WHERE id = ?;
  `);
  stmtReset.run(usuario.id);

  return {
    valido: true,
    usuario: {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol_nombre,
    },
  };
}

module.exports = {
  SALT_ROUNDS,
  registrarUsuario,
  verificarCredenciales,
};
