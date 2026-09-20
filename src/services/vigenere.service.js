const { ALFABETO, INDICE_ALFABETO } = require('../config/crypto.constants');
const { normalizarTexto, puntuarTextoEspanol } = require('./text.service');
const { analizarCesarFuerzaBruta } = require('./cesar.service');

function factorizarNumero(numero) {
  const n = Math.abs(Math.trunc(numero));
  if (n < 2) return [];

  const divisores = [];
  for (let d = 1; d <= Math.sqrt(n); d += 1) {
    if (n % d === 0) {
      divisores.push(d);
      if (d !== n / d) divisores.push(n / d);
    }
  }
  return [...new Set(divisores)].sort((a, b) => a - b);
}

function buscarSecuenciasRepetidas(texto) {
  const resultado = [];
  const longitudes = [3, 4, 5];

  for (const longitud of longitudes) {
    if (texto.length < longitud * 2) continue;

    const mapa = new Map();
    for (let i = 0; i <= texto.length - longitud; i += 1) {
      const secuencia = texto.slice(i, i + longitud);
      if (!mapa.has(secuencia)) mapa.set(secuencia, []);
      mapa.get(secuencia).push(i);
    }

    for (const [secuencia, posiciones] of mapa.entries()) {
      if (posiciones.length < 2) continue;

      const distancias = [];
      for (let i = 0; i < posiciones.length; i += 1) {
        for (let j = i + 1; j < posiciones.length; j += 1) {
          distancias.push(Math.abs(posiciones[j] - posiciones[i]));
        }
      }

      const factores = [...new Set(distancias.flatMap((d) => factorizarNumero(d)))].sort((a, b) => a - b);
      if (distancias.length > 0) {
        resultado.push({ secuencia, longitud, posiciones, distancias, factores });
      }
    }
  }
  return resultado;
}

function analizarKasiski(texto) {
  const repeticiones = buscarSecuenciasRepetidas(texto);
  const contadorFactores = new Map();

  for (const entrada of repeticiones) {
    for (const factor of entrada.factores) {
      if (factor > 1 && factor <= Math.floor(texto.length / 2)) {
        contadorFactores.set(factor, (contadorFactores.get(factor) || 0) + 1);
      }
    }
  }

  const longitudesCandidatas = Array.from(contadorFactores.entries())
    .map(([longitud, frecuencia]) => ({ longitud, frecuencia }))
    .sort((a, b) => b.frecuencia - a.frecuencia || a.longitud - b.longitud);

  if (longitudesCandidatas.length === 0 && texto.length >= 8) {
    for (let longitud = 2; longitud <= Math.min(12, Math.floor(texto.length / 2)); longitud += 1) {
      longitudesCandidatas.push({ longitud, frecuencia: 1 });
    }
  }

  return { repeticiones, contadorFactores, longitudesCandidatas: longitudesCandidatas.slice(0, 12) };
}

function normalizarClaveVigenere(clave) {
  const claveNormalizada = normalizarTexto(clave).textoNormalizado;
  if (!claveNormalizada) return "";

  const longitud = claveNormalizada.length;
  if (longitud <= 1) return claveNormalizada;

  let periodo = longitud;
  for (let i = 1; i <= longitud; i += 1) {
    if (longitud % i === 0) {
      const ciclo = claveNormalizada.slice(0, i);
      const repetido = Array.from({ length: longitud / i }, () => ciclo).join("");
      if (repetido === claveNormalizada) {
        periodo = i;
        break;
      }
    }
  }

  return claveNormalizada.slice(0, periodo);
}

function crearColumnasVigenere(texto, longitud) {
  const columnas = Array.from({ length: longitud }, () => []);
  for (let i = 0; i < texto.length; i += 1) {
    const columna = i % longitud;
    columnas[columna].push(texto[i]);
  }
  return columnas.map((columna) => columna.join(""));
}

function cifrarVigenere(texto, clave) {
  const { textoNormalizado } = normalizarTexto(texto);
  const claveNormalizada = normalizarTexto(clave).textoNormalizado;
  if (!claveNormalizada) return textoNormalizado;

  let salida = "";
  for (let i = 0; i < textoNormalizado.length; i += 1) {
    const indicePlano = INDICE_ALFABETO[textoNormalizado[i]];
    const claveIdx = INDICE_ALFABETO[claveNormalizada[i % claveNormalizada.length]];
    const indiceCifrado = (indicePlano + claveIdx) % 27;
    salida += ALFABETO[indiceCifrado];
  }
  return salida;
}

function descifrarVigenere(texto, clave) {
  const claveNormalizada = normalizarTexto(clave).textoNormalizado;
  if (!claveNormalizada) return texto;

  let salida = "";
  for (let i = 0; i < texto.length; i += 1) {
    const simboloCifrado = texto[i];
    const indiceC = INDICE_ALFABETO[simboloCifrado];
    if (indiceC === undefined) {
      salida += simboloCifrado;
      continue;
    }
    const claveIdx = INDICE_ALFABETO[claveNormalizada[i % claveNormalizada.length]];
    const indiceP = (indiceC - claveIdx + 27) % 27;
    salida += ALFABETO[indiceP];
  }
  return salida;
}

function analizarColumnasVigenere(texto, longitud) {
  const columnas = crearColumnasVigenere(texto, longitud);
  const detalle = [];
  let clave = "";

  for (let i = 0; i < columnas.length; i += 1) {
    const analisisColumna = analizarCesarFuerzaBruta(columnas[i]);
    const desplazamiento = analisisColumna.mejor.desplazamiento;
    clave += ALFABETO[desplazamiento];
    detalle.push({
      columna: i,
      desplazamiento,
      puntuacion: analisisColumna.mejor.puntuacion,
      candidato: analisisColumna.mejor.candidato,
    });
  }

  const claveReducida = normalizarClaveVigenere(clave);
  const textoDescifrado = descifrarVigenere(texto, claveReducida);
  const puntuacion = puntuarTextoEspanol(textoDescifrado);

  return {
    longitud: claveReducida.length || longitud,
    clave: claveReducida,
    columnas,
    detalle,
    textoDescifrado,
    puntuacion,
  };
}

function analizarVigenere(texto) {
  const kasiski = analizarKasiski(texto);
  const candidatas = new Map();
  const longitudesPropuestas = new Set();

  const candidatosBase = (kasiski.longitudesCandidatas || []).slice(0, 4).map((entrada) => entrada.longitud);
  for (const longitud of candidatosBase) {
    if (longitud > 1 && longitud <= Math.floor(texto.length / 2)) {
      longitudesPropuestas.add(longitud);
    }
  }

  const limite = Math.min(12, Math.max(2, Math.floor(texto.length / 20)));
  if (longitudesPropuestas.size === 0) {
    for (let i = 2; i <= limite; i += 1) {
      longitudesPropuestas.add(i);
    }
  }

  for (const longitud of Array.from(longitudesPropuestas).sort((a, b) => a - b)) {
    if (longitud > 0 && longitud <= Math.floor(texto.length / 2)) {
      const resultado = analizarColumnasVigenere(texto, longitud);
      const puntuacionFinal = puntuarTextoEspanol(resultado.textoDescifrado);
      const claveReducida = normalizarClaveVigenere(resultado.clave);
      const key = `${claveReducida}|${resultado.longitud}`;

      if (!candidatas.has(key) || puntuacionFinal > candidatas.get(key).puntuacion) {
        candidatas.set(key, {
          longitud: claveReducida.length || resultado.longitud,
          clave: claveReducida,
          puntuacion: puntuacionFinal,
          textoDescifrado: resultado.textoDescifrado,
          detalle: resultado.detalle,
        });
      }
    }
  }

  const lista = Array.from(candidatas.values()).sort((a, b) => {
    if (b.puntuacion !== a.puntuacion) {
      return b.puntuacion - a.puntuacion;
    }
    return a.longitud - b.longitud;
  });

  return {
    kasiski,
    mejores: lista.slice(0, 10),
    mejor: lista[0] || null,
  };
}

module.exports = {
  factorizarNumero,
  buscarSecuenciasRepetidas,
  analizarKasiski,
  normalizarClaveVigenere,
  crearColumnasVigenere,
  cifrarVigenere,
  descifrarVigenere,
  analizarColumnasVigenere,
  analizarVigenere,
};
