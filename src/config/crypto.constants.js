const ALFABETO = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
const UMBRAL_IC = 0.060;

const INDICE_ALFABETO = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
  K: 10, L: 11, M: 12, N: 13, Ñ: 14, O: 15, P: 16, Q: 17, R: 18,
  S: 19, T: 20, U: 21, V: 22, W: 23, X: 24, Y: 25, Z: 26,
};

const FRECUENCIAS_ESPAÑOL = {
  A: 0.1248, B: 0.0144, C: 0.0253, D: 0.0465, E: 0.1379, F: 0.0069, G: 0.0101,
  H: 0.0074, I: 0.0616, J: 0.0044, K: 0.0002, L: 0.0497, M: 0.0315, N: 0.0671,
  Ñ: 0.0037, O: 0.0863, P: 0.0250, Q: 0.0089, R: 0.0682, S: 0.0798, T: 0.0469,
  U: 0.0399, V: 0.0090, W: 0.0001, X: 0.0022, Y: 0.0090, Z: 0.0052,
};

const BIGRAMAS_ESPAÑOL = {
  ES: 12.2, EN: 11.8, EL: 8.3, DE: 8.1, LA: 7.9, AS: 7.1, AR: 6.7, ER: 6.5,
  RE: 6.2, AL: 6.0, OR: 5.7, AN: 5.6, ST: 5.4, SI: 5.1, TA: 5.0, ON: 4.9,
  RO: 4.8, IO: 4.7, PA: 4.3, CO: 4.3, RA: 4.2, MA: 4.1, IN: 4.0, TE: 3.9,
  TI: 3.8, TO: 3.8, AC: 3.8, NI: 3.7, CE: 3.7, NA: 3.6, DA: 3.6, PE: 3.5,
  LL: 3.4, QU: 3.4, UN: 3.4, SE: 3.4, NO: 3.3, RI: 3.2, IC: 3.2, UE: 3.1,
};

const TRIGRAMAS_ESPAÑOL = {
  QUE: 11.5, EST: 10.2, POR: 8.4, CON: 7.8, PAR: 7.1, DEL: 6.9, ELA: 6.6,
  ENT: 6.5, RES: 6.0, ARA: 5.7, PER: 5.5, LAS: 5.4, MEN: 5.2, COM: 5.1,
  ADE: 5.0, TRA: 4.9, OTR: 4.8, PRO: 4.8, CIE: 4.6, SON: 4.5, ERE: 4.5,
  UNA: 4.4, NTE: 4.3, DES: 4.2, TER: 4.2, LOS: 4.1, ADO: 4.1, DOS: 4.0,
  TAL: 4.0, IEN: 4.0, SIA: 3.9,
};

const SECUENCIAS_IMPROBABLES = [
  "QJ", "JW", "ÑQ", "ZX", "QÑ", "VQ", "WQ", "JÑ", "KJ", "QW",
  "ZQ", "XQ", "ÑW", "QX", "HX", "QZ", "JQ", "KQ", "VV", "KK"
];

module.exports = {
  ALFABETO,
  UMBRAL_IC,
  INDICE_ALFABETO,
  FRECUENCIAS_ESPAÑOL,
  BIGRAMAS_ESPAÑOL,
  TRIGRAMAS_ESPAÑOL,
  SECUENCIAS_IMPROBABLES,
};
