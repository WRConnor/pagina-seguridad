const path = require('node:path');
const { verificarCredenciales, registrarUsuario } = require('../services/auth.service');
const { registrarFalloIP, registrarExitoIP } = require('../middlewares/bruteForce.middleware');

function mostrarFormularioLogin(req, res) {
  if (req.session && req.session.usuario) {
    return res.redirect('/');
  }
  return res.sendFile(path.join(__dirname, '../../public/login.html'));
}

async function procesarLogin(req, res) {
  const { username, password } = req.body || {};
  const ip = req.ipCliente || req.ip || req.connection.remoteAddress || '127.0.0.1';
  const esPeticionJson = req.xhr || req.headers.accept?.includes('application/json');

  if (!username || !password) {
    const errorMsg = 'Debe suministrar usuario y contraseña.';
    if (esPeticionJson) {
      return res.status(400).json({ error: errorMsg });
    }
    return res.redirect(`/login?error=${encodeURIComponent(errorMsg)}`);
  }

  const resultado = await verificarCredenciales(username, password);

  // Si las credenciales fallan o la cuenta está bloqueada
  if (!resultado.valido) {
    const estadoIP = registrarFalloIP(ip);

    // Si la IP supera el límite de 5 intentos fallidos
    if (estadoIP.bloqueado) {
      const errorBloqueo = `Demasiados intentos fallidos. Su IP ha sido bloqueada temporalmente. Intente de nuevo en ${estadoIP.segundosRestantes} segundos.`;
      if (esPeticionJson) {
        return res.status(429).json({
          error: errorBloqueo,
          bloqueado: true,
          segundosRestantes: estadoIP.segundosRestantes,
        });
      }
      return res.redirect(`/login?error=${encodeURIComponent(errorBloqueo)}`);
    }

    const errorMsg = resultado.error || 'Credenciales inválidas.';
    if (esPeticionJson) {
      return res.status(401).json({
        error: errorMsg,
        intentosRestantes: resultado.intentosRestantes,
      });
    }
    return res.redirect(`/login?error=${encodeURIComponent(errorMsg)}`);
  }

  // Autenticación exitosa
  registrarExitoIP(ip);
  req.session.usuario = resultado.usuario;

  if (esPeticionJson) {
    return res.json({
      exitoso: true,
      mensaje: 'Autenticación exitosa.',
      usuario: resultado.usuario,
      redirectUrl: '/',
    });
  }

  return res.redirect('/');
}

function mostrarFormularioRegistro(req, res) {
  if (req.session && req.session.usuario) {
    return res.redirect('/');
  }
  return res.sendFile(path.join(__dirname, '../../public/registro.html'));
}

function procesarLogout(req, res) {
  req.session = null;
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({ exitoso: true, mensaje: 'Sesión cerrada correctamente.' });
  }
  return res.redirect('/login');
}

async function procesarRegistro(req, res) {
  const { username, password, confirmPassword } = req.body || {};
  const esPeticionJson = req.xhr || req.headers.accept?.includes('application/json');

  if (!username || !password) {
    const errorMsg = 'Debe suministrar usuario y contraseña.';
    if (esPeticionJson) return res.status(400).json({ error: errorMsg });
    return res.redirect(`/registro?error=${encodeURIComponent(errorMsg)}`);
  }

  if (password.length < 6) {
    const errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
    if (esPeticionJson) return res.status(400).json({ error: errorMsg });
    return res.redirect(`/registro?error=${encodeURIComponent(errorMsg)}`);
  }

  if (confirmPassword && password !== confirmPassword) {
    const errorMsg = 'Las contraseñas no coinciden.';
    if (esPeticionJson) return res.status(400).json({ error: errorMsg });
    return res.redirect(`/registro?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    const nuevoUsuario = await registrarUsuario(username.trim(), password, 2); // Rol 2: Usuario
    const mensajeExito = 'Usuario registrado exitosamente con BCrypt. Inicie sesión.';
    if (esPeticionJson) {
      return res.status(201).json({
        exitoso: true,
        mensaje: mensajeExito,
        usuario: { id: nuevoUsuario.id, username: nuevoUsuario.username },
        redirectUrl: `/login?mensaje=${encodeURIComponent(mensajeExito)}`,
      });
    }
    return res.redirect(`/login?mensaje=${encodeURIComponent(mensajeExito)}`);
  } catch (error) {
    if (esPeticionJson) return res.status(400).json({ error: error.message });
    return res.redirect(`/registro?error=${encodeURIComponent(error.message)}`);
  }
}

function obtenerUsuarioActual(req, res) {
  if (req.session && req.session.usuario) {
    return res.json({
      autenticado: true,
      usuario: req.session.usuario,
    });
  }
  return res.json({
    autenticado: false,
    usuario: null,
  });
}

module.exports = {
  mostrarFormularioLogin,
  mostrarFormularioRegistro,
  procesarLogin,
  procesarLogout,
  procesarRegistro,
  obtenerUsuarioActual,
};
