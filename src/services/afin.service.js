const { ALFABETO, INDICE_ALFABETO } = require('../config/crypto.constants');
const { normalizarTexto, calcularFrecuencias, puntuarTextoEspanol } = require('./text.service');

function mcd(a, b) {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const resto = x % y;
    x = y;
    y = resto;
  }
  return x;
}

function esCoprimo(a, modulo = 27) {
  return mcd(a, modulo) === 1;
}

function inversoModular(a, modulo = 27) {
  const moduloNormalizado = Math.abs(Math.trunc(modulo));
  const valor = ((Math.trunc(a) % moduloNormalizado) + moduloNormalizado) % moduloNormalizado;

  if (mcd(valor, moduloNormalizado) !== 1) return null;

  let t = 0, nuevoT = 1;
  let r = moduloNormalizado, nuevoR = valor;

  while (nuevoR !== 0) {
    const cociente = Math.floor(r / nuevoR);
    [t, nuevoT] = [nuevoT, t - cociente * nuevoT];
    [r, nuevoR] = [nuevoR, r - cociente * nuevoR];
  }

  if (r !== 1) return null;
  return t < 0 ? t + moduloNormalizado : t;
}

function cifrarAfin(texto, a, b) {
  const { textoNormalizado } = normalizarTexto(texto);
  const factorA = Number(a);
  const shiftB = ((Number(b) % 27) + 27) % 27;

  if (!esCoprimo(factorA, 27)) return null;

  return Array.from(textoNormalizado)
    .map((simbolo) => {
      const indice = INDICE_ALFABETO[simbolo];
      if (indice === undefined) return simbolo;
      return ALFABETO[(factorA * indice + shiftB) % 27];
    })
    .join("");
}

function descifrarAfin(texto, a, b) {
  const inverso = inversoModular(a, 27);
  if (inverso === null) return null;

  const shiftB = ((Number(b) % 27) + 27) % 27;

  return Array.from(texto)
    .map((simbolo) => {
      const indice = INDICE_ALFABETO[simbolo];
      if (indice === undefined) return simbolo;
      const valor = (inverso * ((indice - shiftB + 27) % 27)) % 27;
      return ALFABETO[valor];
    })
    .join("");
}

function analizarAfin(texto) {
  const frecuencias = calcularFrecuencias(texto);
  const ranking = Array.from(ALFABETO)
    .map((letra, indice) => ({ letra, frecuencia: frecuencias.absoluta[indice] }))
    .sort((a, b) => b.frecuencia - a.frecuencia);

  const candidatos = [];
  const letrasCandidatas = ["E", "A"];

  for (const claveTexto1 of letrasCandidatas) {
    for (const claveTexto2 of letrasCandidatas) {
      if (claveTexto1 === claveTexto2) continue;

      const p1 = INDICE_ALFABETO[claveTexto1];
      const p2 = INDICE_ALFABETO[claveTexto2];

      for (let i = 0; i < Math.min(4, ranking.length); i += 1) {
        for (let j = 0; j < Math.min(4, ranking.length); j += 1) {
          if (i === j) continue;

          const c1 = INDICE_ALFABETO[ranking[i].letra];
          const c2 = INDICE_ALFABETO[ranking[j].letra];
          const diferenciaPlano = (p1 - p2 + 27) % 27;
          const diferenciaCifrado = (c1 - c2 + 27) % 27;

          if (mcd(diferenciaPlano, 27) !== 1) continue;

          const inversoPlano = inversoModular(diferenciaPlano, 27);
          if (inversoPlano === null) continue;

          const a = (diferenciaCifrado * inversoPlano) % 27;
          if (!esCoprimo(a, 27)) continue;

          const b = (c1 - (a * p1) % 27 + 27) % 27;
          const descifrado = descifrarAfin(texto, a, b);
          if (!descifrado) continue;

          const puntuacion = puntuarTextoEspanol(descifrado);
          candidatos.push({
            a,
            b,
            puntuacion,
            candidato: descifrado,
            hipotesis: `${ranking[i].letra}→${claveTexto1}, ${ranking[j].letra}→${claveTexto2}`,
          });
        }
      }
    }
  }

  const busquedaExhaustiva = [];
  for (let a = 1; a < 27; a += 1) {
    if (!esCoprimo(a, 27)) continue;

    for (let b = 0; b < 27; b += 1) {
      const descifrado = descifrarAfin(texto, a, b);
      if (!descifrado) continue;
      const puntuacion = puntuarTextoEspanol(descifrado);
      busquedaExhaustiva.push({ a, b, puntuacion, candidato: descifrado });
    }
  }

  busquedaExhaustiva.sort((x, y) => y.puntuacion - x.puntuacion);
  const candidatesSort = [...candidatos].sort((x, y) => y.puntuacion - x.puntuacion);

  const mejorHipotesis = candidatesSort[0] || null;
  const mejorExhaustivo = busquedaExhaustiva[0] || null;
  const mejorResultado =
    mejorHipotesis && mejorExhaustivo
      ? mejorHipotesis.puntuacion >= mejorExhaustivo.puntuacion
        ? mejorHipotesis
        : mejorExhaustivo
      : mejorHipotesis || mejorExhaustivo;

  return {
    frecuenciaTop: ranking.slice(0, 5),
    hipotesis: mejorHipotesis,
    mejor: mejorResultado,
    busquedaExhaustiva: busquedaExhaustiva.slice(0, 10),
    validado: !!mejorResultado,
    candidatos: candidatesSort.slice(0, 8),
  };
}

module.exports = {
  mcd,
  esCoprimo,
  inversoModular,
  cifrarAfin,
  descifrarAfin,
  analizarAfin,
};
