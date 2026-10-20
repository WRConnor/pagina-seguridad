const os = require('node:os');

/**
 * Obtiene la IP de la máquina de manera automática.
 * 
 * Orden de resolución:
 * 1. Variable de entorno HOST_IP o VPS_IP (si fue configurada explícitamente).
 * 2. Interfaces de red físicas/virtuales no internas (IPv4), priorizando
 *    rangos accesibles de red local o pública sobre adaptadores internos.
 * 3. Fallback a 127.0.0.1 en caso de aislamiento total de red.
 *
 * @returns {string} Dirección IPv4 detectada.
 */
function obtenerIPMaquina() {
  if (process.env.HOST_IP && process.env.HOST_IP.trim()) {
    return process.env.HOST_IP.trim();
  }
  if (process.env.VPS_IP && process.env.VPS_IP.trim()) {
    return process.env.VPS_IP.trim();
  }

  const interfaces = os.networkInterfaces();
  const candidatas = [];

  for (const nombreInterfaz of Object.keys(interfaces)) {
    for (const iface of interfaces[nombreInterfaz]) {
      // Filtrar sólo IPv4 no internas (descartar 127.0.0.1 y Loopback)
      if (iface.family === 'IPv4' && !iface.internal) {
        candidatas.push({
          interfaz: nombreInterfaz,
          ip: iface.address,
        });
      }
    }
  }

  if (candidatas.length > 0) {
    // Preferir interfaces primarias (Ethernet, eth0, ens, Wi-Fi, wlan)
    const preferida = candidatas.find((c) =>
      /^(eth|ens|eno|enp|ethernet|wi-fi|wlan)/i.test(c.interfaz)
    );
    return preferida ? preferida.ip : candidatas[0].ip;
  }

  return '127.0.0.1';
}

module.exports = {
  obtenerIPMaquina,
};
