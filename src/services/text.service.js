const {
  ALFABETO,
  INDICE_ALFABETO,
  FRECUENCIAS_ESPAÑOL,
  BIGRAMAS_ESPAÑOL,
  TRIGRAMAS_ESPAÑOL,
  SECUENCIAS_IMPROBABLES,
} = require('../config/crypto.constants');

function normalizarTexto(texto) {
  const cadena = String(texto || "");
  const limpia = cadena
    .toUpperCase()
    .replace(/Ñ/g, "__ENNE__")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/__ENNE__/g, "Ñ");

  const caracteresInvalidos = [];
  const validos = [];

  for (const simbolo of limpia) {
    if (ALFABETO.includes(simbolo)) {
      validos.push(simbolo);
    } else if (/\s/.test(simbolo) || simbolo === "\n" || simbolo === "\r" || simbolo === "\t") {
      continue;
    } else {
      caracteresInvalidos.push(simbolo);
    }
  }

  return {
    textoNormalizado: validos.join(""),
    caracteresInvalidos,
    numeroInvalidos: caracteresInvalidos.length,
    numeroValidos: validos.length,
  };
}

function calcularFrecuencias(texto) {
  const frecuencias = Array(27).fill(0);
  for (const simbolo of texto) {
    const indice = INDICE_ALFABETO[simbolo];
    if (indice !== undefined) {
      frecuencias[indice] += 1;
    }
  }
  const total = texto.length;
  const relativas = frecuencias.map((valor) => (total === 0 ? 0 : valor / total));

  return { absoluta: frecuencias, relativa: relativas, total };
}

function calcularIndiceCoincidencia(texto) {
  const longitud = texto.length;
  if (longitud < 2) {
    return {
      N: longitud,
      mensaje: "No hay suficientes caracteres para calcular el Índice de Coincidencia.",
      indice: null,
      frecuencias: Array(27).fill(0),
      absoluta: Array(27).fill(0),
      relativa: Array(27).fill(0),
    };
  }
  const { absoluta, relativa } = calcularFrecuencias(texto);
  const acumulado = absoluta.reduce((suma, frecuencia) => suma + frecuencia * (frecuencia - 1), 0);
  const indice = acumulado / (longitud * (longitud - 1));

  return {
    N: longitud,
    mensaje: "",
    indice,
    frecuencias: absoluta,
    absoluta,
    relativa,
  };
}

function puntuarTextoEspanol(texto) {
  const { textoNormalizado } = normalizarTexto(texto);
  if (!textoNormalizado) return 0;

  let score = 0;
  const { absoluta, total } = calcularFrecuencias(textoNormalizado);
  const longitud = Math.max(1, total);

  for (let i = 0; i < ALFABETO.length; i += 1) {
    const letra = ALFABETO[i];
    const frecuenciaEsperada = FRECUENCIAS_ESPAÑOL[letra] || 0.0001;
    const frecuenciaReal = absoluta[i] / longitud;
    score += ((frecuenciaEsperada - frecuenciaReal) ** 2) * -15000;
    score += frecuenciaReal * 2000 * frecuenciaEsperada;
  }

  for (let i = 0; i <= textoNormalizado.length - 2; i += 1) {
    const bigrama = textoNormalizado.slice(i, i + 2);
    if (bigrama.length === 2) {
      score += (BIGRAMAS_ESPAÑOL[bigrama] || 0) * 110;
    }
  }

  for (let i = 0; i <= textoNormalizado.length - 3; i += 1) {
    const trigrama = textoNormalizado.slice(i, i + 3);
    if (trigrama.length === 3) {
      score += (TRIGRAMAS_ESPAÑOL[trigrama] || 0) * 260;
    }
  }

  const vocales = [...textoNormalizado].filter((letra) => "AEIOU".includes(letra)).length;
  const ratioVocales = vocales / textoNormalizado.length;
  score += ratioVocales * 4000;

  const letrasExtrañas = [...textoNormalizado].filter((letra) => "QWJKXZ".includes(letra)).length;
  score -= letrasExtrañas * 750;

  for (const secuencia of SECUENCIAS_IMPROBABLES) {
    const ocurrencias = textoNormalizado.split(secuencia).length - 1;
    score -= ocurrencias * 800;
  }

  if (/(.)\1{3,}/.test(textoNormalizado)) {
    score -= 1200;
  }

  return score;
}

module.exports = {
  normalizarTexto,
  calcularFrecuencias,
  calcularIndiceCoincidencia,
  puntuarTextoEspanol,
};
