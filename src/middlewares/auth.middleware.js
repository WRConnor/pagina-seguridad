function requiereAutenticacion(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }

  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      error: 'Acceso no autorizado. Debe iniciar sesión para utilizar las herramientas de criptoanálisis.',
      autenticado: false,
    });
  }

  return res.redirect('/login');
}

function requiereRol(rolRequerido) {
  return (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      return res.status(401).redirect('/login');
    }

    if (req.session.usuario.rol !== rolRequerido && req.session.usuario.rol !== 'Administrador') {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere el rol ${rolRequerido}.`,
      });
    }

    next();
  };
}

module.exports = {
  requiereAutenticacion,
  requiereRol,
};
