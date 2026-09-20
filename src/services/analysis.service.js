const { UMBRAL_IC, ALFABETO } = require('../config/crypto.constants');
const { normalizarTexto, calcularIndiceCoincidencia } = require('./text.service');
const { analizarCesarFuerzaBruta } = require('./cesar.service');
const { analizarAfin } = require('./afin.service');
const { analizarVigenere } = require('./vigenere.service');

function construirTablaFrecuencias(ic) {
  const absoluta = Array.isArray(ic.absoluta) ? ic.absoluta : Array(27).fill(0);
  const relativa = Array.isArray(ic.relativa) ? ic.relativa : Array(27).fill(0);

  return Array.from(ALFABETO).map((letra, indice) => ({
    letra,
    absoluta: absoluta[indice] || 0,
    relativa: relativa[indice] || 0,
  }));
}

function analizarCriptogramaCompleto(rawText) {
  const { textoNormalizado, caracteresInvalidos, numeroInvalidos, numeroValidos } = normalizarTexto(rawText);

  if (numeroValidos === 0) {
    return {
      valido: false,
      mensaje: "No se detectaron caracteres válidos del alfabeto español de 27 símbolos.",
      caracteresInvalidos,
      numeroInvalidos,
      numeroValidos,
    };
  }

  const ic = calcularIndiceCoincidencia(textoNormalizado);
  const tablaFrecuencias = construirTablaFrecuencias(ic);

  const advertenciaLongitud = numeroValidos < 400
    ? "El criptograma tiene menos de 400 caracteres; este valor está por debajo del mínimo recomendado para la práctica."
    : null;

  if (ic.indice === null) {
    return {
      valido: false,
      mensaje: ic.mensaje,
      numeroValidos,
      numeroInvalidos,
      caracteresInvalidos,
      advertenciaLongitud,
      ic,
      tablaFrecuencias,
    };
  }

  const esMonoalfabetico = ic.indice > UMBRAL_IC;
  const tipoCifrado = esMonoalfabetico ? "mono" : "vigenere";

  let resultadoMetodo = null;

  if (esMonoalfabetico) {
    const cesar = analizarCesarFuerzaBruta(textoNormalizado);
    const afin = analizarAfin(textoNormalizado);
    const ganador = cesar.mejor.puntuacion >= (afin.mejor ? afin.mejor.puntuacion : -Infinity) ? "César" : "Afin";
    const mejorCesar = cesar.mejor;
    const mejorAfin = afin.mejor;
    const metodo = ganador === "César" ? "César" : "Afin";
    const candidato = ganador === "César" ? mejorCesar : mejorAfin;

    const ranking = (ganador === "César" ? cesar.ranking : afin.busquedaExhaustiva || []).slice(0, 10);

    resultadoMetodo = {
      tipo: "mono",
      metodoGanador: metodo,
      textoCifrado: textoNormalizado,
      textoDescifrado: candidato.candidato,
      puntuacion: candidato.puntuacion,
      parametros: metodo === "César"
        ? { desplazamiento: candidato.desplazamiento }
        : { a: candidato.a, b: candidato.b },
      ranking,
      detalles: {
        ic: ic.indice,
        umbral: UMBRAL_IC,
        heuristica: "IC > 0.060 → Sustitución monoalfabética; se comparó César y Afín.",
        frecuenciaTop: afin.frecuenciaTop.slice(0, 5),
        hipotesisAfin: afin.hipotesis ? afin.hipotesis.hipotesis : "Sin hipótesis válida",
      },
    };
  } else {
    const vigenere = analizarVigenere(textoNormalizado);
    const mejor = vigenere.mejor;

    resultadoMetodo = {
      tipo: "vigenere",
      metodoGanador: "Vigenère mediante Kasiski",
      textoCifrado: textoNormalizado,
      textoDescifrado: mejor ? mejor.textoDescifrado : "No se obtuvo clave válida",
      puntuacion: mejor ? mejor.puntuacion : 0,
      parametros: {
        longitudClave: mejor ? mejor.longitud : null,
        clave: mejor ? mejor.clave : null,
      },
      ranking: vigenere.mejores.slice(0, 8),
      detalles: {
        ic: ic.indice,
        umbral: UMBRAL_IC,
        heuristica: "IC ≤ 0.060 → Cifrado polialfabético; se emplea Kasiski + análisis estadístico por columnas.",
        secuenciasRepetidas: vigenere.kasiski.repeticiones.length,
        longitudesCandidatas: vigenere.kasiski.longitudesCandidatas,
      },
    };
  }

  return {
    valido: true,
    numeroValidos,
    numeroInvalidos,
    caracteresInvalidos,
    advertenciaLongitud,
    ic,
    tablaFrecuencias,
    tipoCifrado,
    resultadoMetodo,
  };
}

module.exports = {
  analizarCriptogramaCompleto,
};
