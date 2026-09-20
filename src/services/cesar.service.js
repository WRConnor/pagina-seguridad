const { ALFABETO, INDICE_ALFABETO } = require('../config/crypto.constants');
const { normalizarTexto, puntuarTextoEspanol } = require('./text.service');

function cifrarCesar(texto, desplazamiento) {
  const { textoNormalizado } = normalizarTexto(texto);
  const shift = ((Number(desplazamiento) % 27) + 27) % 27;

  return Array.from(textoNormalizado)
    .map((simbolo) => {
      const indice = INDICE_ALFABETO[simbolo];
      if (indice === undefined) return simbolo;
      return ALFABETO[(indice + shift) % 27];
    })
    .join("");
}

function descifrarCesar(texto, desplazamiento) {
  const shift = ((Number(desplazamiento) % 27) + 27) % 27;
  return Array.from(texto)
    .map((simbolo) => {
      const indice = INDICE_ALFABETO[simbolo];
      if (indice === undefined) return simbolo;
      const nuevoIndice = (indice - shift + 27) % 27;
      return ALFABETO[nuevoIndice];
    })
    .join("");
}

function analizarCesarFuerzaBruta(texto) {
  const resultados = [];

  for (let desplazamiento = 0; desplazamiento < 27; desplazamiento += 1) {
    const descifrado = descifrarCesar(texto, desplazamiento);
    const puntuacion = puntuarTextoEspanol(descifrado);
    const vocales = [...descifrado].filter((letra) => "AEIOU".includes(letra)).length;
    const ratioVocales = vocales / Math.max(1, descifrado.length);
    resultados.push({
      desplazamiento,
      puntuacion: puntuacion + ratioVocales * 1200,
      candidato: descifrado,
    });
  }

  resultados.sort((a, b) => b.puntuacion - a.puntuacion);
  return {
    mejor: resultados[0],
    ranking: resultados,
  };
}

module.exports = {
  cifrarCesar,
  descifrarCesar,
  analizarCesarFuerzaBruta,
};
