const { analizarCriptogramaCompleto } = require('../services/analysis.service');
const { cifrarCesar } = require('../services/cesar.service');
const { cifrarAfin, esCoprimo } = require('../services/afin.service');
const { cifrarVigenere } = require('../services/vigenere.service');

function analizar(req, res) {
  const { criptograma } = req.body || {};
  if (!criptograma || typeof criptograma !== 'string' || criptograma.trim() === '') {
    return res.status(400).json({
      exitoso: false,
      error: 'Debe proporcionar un criptograma para analizar.',
    });
  }

  try {
    const resultado = analizarCriptogramaCompleto(criptograma);
    return res.json({
      exitoso: true,
      data: resultado,
    });
  } catch (error) {
    return res.status(500).json({
      exitoso: false,
      error: 'Error interno durante el criptoanálisis: ' + error.message,
    });
  }
}

function encriptar(req, res) {
  const { metodo, texto, desplazamiento, a, b, clave } = req.body || {};

  if (!texto || typeof texto !== 'string' || texto.trim() === '') {
    return res.status(400).json({
      exitoso: false,
      error: 'Debe escribir un texto para cifrar.',
    });
  }

  try {
    let cifrado = '';

    if (metodo === 'cesar') {
      const shift = Number(desplazamiento !== undefined ? desplazamiento : 5);
      cifrado = cifrarCesar(texto, shift);
    } else if (metodo === 'afin') {
      const factorA = Number(a !== undefined ? a : 5);
      const shiftB = Number(b !== undefined ? b : 8);

      if (!esCoprimo(factorA, 27)) {
        return res.status(400).json({
          exitoso: false,
          error: 'La clave a debe ser coprima con 27 (ejemplos: 1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26).',
        });
      }

      const resultadoAfin = cifrarAfin(texto, factorA, shiftB);
      if (resultadoAfin === null) {
        return res.status(400).json({
          exitoso: false,
          error: 'Parámetros de clave Afín inválidos.',
        });
      }
      cifrado = resultadoAfin;
    } else if (metodo === 'vigenere') {
      const claveVig = String(clave || 'CLAVE');
      cifrado = cifrarVigenere(texto, claveVig);
    } else {
      return res.status(400).json({
        exitoso: false,
        error: `Método de cifrado desconocido: ${metodo}`,
      });
    }

    return res.json({
      exitoso: true,
      metodo,
      cifrado,
    });
  } catch (error) {
    return res.status(500).json({
      exitoso: false,
      error: 'Error procesando el cifrado: ' + error.message,
    });
  }
}

function healthCheck(req, res) {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'PaginaSeguridad Crypto & Auth API',
  });
}

module.exports = {
  analizar,
  encriptar,
  healthCheck,
};
