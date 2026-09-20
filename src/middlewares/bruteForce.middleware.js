// ==============================================================================
// MIDDLEWARE DE PROTECCIÓN CONTRA ATAQUES DE FUERZA BRUTA
// Basado en la Sección 3 de la Guía de Laboratorio (Universidad El Bosque)
// ==============================================================================

const intentosIP = new Map(); // Almacenamiento temporal en memoria
const VENTANA_TIEMPO = 15 * 60 * 1000; // 15 minutos en milisegundos
const MAX_INTENTOS = 5; // Máximo 5 intentos consecutivos antes del bloqueo

function middlewareProteccionFuerzaBruta(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
  const ahora = Date.now();

  if (!intentosIP.has(ip)) {
    intentosIP.set(ip, {
      conteo: 0,
      primerIntento: ahora,
      bloqueadoHasta: 0,
    });
  }

  const registro = intentosIP.get(ip);

  // 1. Verificar si la IP está bloqueada actualmente
  if (registro.bloqueadoHasta > ahora) {
    const segundosRestantes = Math.ceil((registro.bloqueadoHasta - ahora) / 1000);
    const mensajeError = `Demasiados intentos fallidos. Su IP ha sido bloqueada temporalmente. Intente de nuevo en ${segundosRestantes} segundos.`;

    if (req.accepts('json') || req.xhr) {
      return res.status(429).json({
        error: mensajeError,
        bloqueado: true,
        segundosRestantes,
      });
    }

    return res.status(429).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>429 - IP Bloqueada</title>
        <link rel="stylesheet" href="/css/style.css">
      </head>
      <body>
        <main class="container" style="max-width: 600px; margin-top: 60px;">
          <div class="panel" style="text-align: center;">
            <h1 style="color: var(--danger);">Acceso Bloqueado (HTTP 429)</h1>
            <p>${mensajeError}</p>
            <p style="color: var(--muted);">Mecanismo perimetral de defensa contra fuerza bruta activo.</p>
            <a href="/login" class="top-nav a" style="display: inline-block; margin-top: 15px; color: var(--primary);">Reintentar</a>
          </div>
        </main>
      </body>
      </html>
    `);
  }

  // 2. Reiniciar conteo si expiró la ventana de tiempo
  if (ahora - registro.primerIntento > VENTANA_TIEMPO) {
    registro.conteo = 0;
    registro.primerIntento = ahora;
    registro.bloqueadoHasta = 0;
  }

  req.registroIP = registro;
  req.ipCliente = ip;
  next();
}

function registrarFalloIP(ip) {
  const ahora = Date.now();
  if (!intentosIP.has(ip)) {
    intentosIP.set(ip, { conteo: 0, primerIntento: ahora, bloqueadoHasta: 0 });
  }

  const registro = intentosIP.get(ip);
  registro.conteo += 1;

  if (registro.conteo >= MAX_INTENTOS) {
    registro.bloqueadoHasta = ahora + VENTANA_TIEMPO;
  }

  return {
    conteo: registro.conteo,
    bloqueado: registro.bloqueadoHasta > ahora,
    segundosRestantes: Math.ceil(VENTANA_TIEMPO / 1000),
  };
}

function registrarExitoIP(ip) {
  if (intentosIP.has(ip)) {
    const registro = intentosIP.get(ip);
    registro.conteo = 0;
    registro.bloqueadoHasta = 0;
    registro.primerIntento = Date.now();
  }
}

function limpiarRegistroIP(ip) {
  intentosIP.delete(ip);
}

module.exports = {
  middlewareProteccionFuerzaBruta,
  registrarFalloIP,
  registrarExitoIP,
  limpiarRegistroIP,
  MAX_INTENTOS,
  VENTANA_TIEMPO,
};
