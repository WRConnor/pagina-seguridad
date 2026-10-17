function requiereAutenticacion(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }

  // Si la petición espera JSON o es una llamada a la API
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      error: 'Acceso no autorizado (HTTP 401). Debe iniciar sesión para acceder a este recurso.',
      autenticado: false,
    });
  }

  // Petición por navegador (HTML): Responder con código HTTP 401 Unauthorized
  const rutaSolicitada = req.originalUrl || req.url || '/';

  return res.status(401).send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>401 - No Autorizado</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <main class="container login-container" style="max-width: 540px; margin-top: 50px;">
    <header class="header">
      <p class="eyebrow">Universidad El Bosque — Seguridad de la Información</p>
      <h1 style="color: var(--danger, #ff8b8b);">401 Unauthorized</h1>
      <p class="subtitle">Acceso denegado: intento de acceso no autenticado por URL</p>
    </header>

    <section class="login-card" style="text-align: center;">
      <div style="font-size: 3.5rem; margin-bottom: 12px;">🔒</div>
      <h2>Acceso No Autorizado</h2>
      <p class="login-subtitle">
        Se detectó un intento de saltar el inicio de sesión para acceder a una ruta protegida.
      </p>

      <div class="alert error" style="margin-bottom: 22px; text-align: left;">
        <strong>Error de Seguridad (HTTP 401):</strong><br>
        La ruta <code>${rutaSolicitada}</code> requiere credenciales válidas. No se permite el acceso sin una sesión activa.
      </div>

      <a href="/login" class="nav-link" style="display: block; width: 100%; box-sizing: border-box; text-align: center; text-decoration: none; padding: 12px; background: var(--primary, #67d0ff); color: #0b1020; font-weight: 700; border-radius: 8px; font-size: 1rem;">
        Ir al Inicio de Sesión
      </a>

      <div style="margin-top: 18px; font-size: 0.85rem; color: var(--muted, #b1bfdc);">
        ¿No tienes una cuenta? <a href="/registro" style="color: var(--primary, #67d0ff); text-decoration: none; font-weight: 600;">Regístrate aquí</a>
      </div>
    </section>
  </main>
</body>
</html>
  `);
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
