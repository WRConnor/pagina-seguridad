document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("inputCriptograma");
  const alerta = document.getElementById("alertaEntrada");
  const estadisticas = document.getElementById("estadisticas");
  const metodoBox = document.getElementById("metodoSeleccionado");
  const resultadoMetodo = document.getElementById("resultadoMetodo");
  const detallesContenido = document.getElementById("detallesContenido");
  const copiarBtn = document.getElementById("copiarResultado");
  const analizarBtn = document.getElementById("analizarBtn");
  const limpiarBtn = document.getElementById("limpiarBtn");

  let textoDescifradoActual = "";

  // Criptograma de ejemplo inicial
  const ejemplo = "QXJERÑQRSJHYAÑTQÑKXZPABEMDCLSQÑVQTRÑYLKJQXVÑTQÑAMSTU";
  if (input) input.value = ejemplo;

  function renderizarTablaFrecuencias(filas) {
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Letra</th>
              <th>Absoluta</th>
              <th>Relativa</th>
            </tr>
          </thead>
          <tbody>
            ${filas
              .map(
                (fila) => `
                <tr>
                  <td>${fila.letra}</td>
                  <td>${fila.absoluta}</td>
                  <td>${(fila.relativa * 100).toFixed(4)}%</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function mostrarAlerta(mensaje, tipo = "info") {
    alerta.innerHTML = mensaje;
    alerta.className = `alert ${tipo}`;
    alerta.classList.remove("hidden");
  }

  function ocultarAlerta() {
    alerta.textContent = "";
    alerta.className = "alert hidden";
  }

  async function analizarCriptograma() {
    const texto = input.value.trim();
    if (!texto) {
      mostrarAlerta("Debe ingresar un criptograma para analizar.", "error");
      return;
    }

    analizarBtn.disabled = true;
    analizarBtn.textContent = "Analizando con Backend...";
    ocultarAlerta();

    try {
      const response = await ApiService.analizarCriptograma(texto);
      const res = response.data;

      if (!res || !res.valido) {
        mostrarAlerta(res?.mensaje || "No se pudo analizar el criptograma.", "error");
        estadisticas.innerHTML = "";
        metodoBox.innerHTML = "";
        resultadoMetodo.innerHTML = "<p>No hay texto útil para analizar.</p>";
        detallesContenido.innerHTML = "<p>Introduce un criptograma válido.</p>";
        copiarBtn.classList.add("hidden");
        return;
      }

      // 1. Manejo de Alertas (caracteres inválidos / longitud)
      let mensajeAlerta = "";
      let tipoAlerta = "info";

      if (res.numeroInvalidos > 0) {
        tipoAlerta = "warning";
        const muestraInvalidos = [...new Set(res.caracteresInvalidos)].slice(0, 12).join(", ");
        mensajeAlerta = `Se encontraron ${res.numeroInvalidos} caracteres no válidos y se ignoraron: ${muestraInvalidos}${
          res.numeroInvalidos > 12 ? " ..." : ""
        }`;
      } else {
        mensajeAlerta = "Entrada normalizada correctamente en el backend. Se conservaron los 27 símbolos válidos del alfabeto español.";
      }

      if (res.advertenciaLongitud) {
        mensajeAlerta += `<br><strong>Advertencia:</strong> ${res.advertenciaLongitud}`;
      }

      mostrarAlerta(mensajeAlerta, tipoAlerta);

      // 2. Estadísticas e Índice de Coincidencia
      estadisticas.innerHTML = `
        <div class="stat-card">
          <span class="label">Longitud</span>
          <span class="value">${res.ic.N}</span>
        </div>
        <div class="stat-card">
          <span class="label">Caracteres válidos</span>
          <span class="value">${res.numeroValidos}</span>
        </div>
        <div class="stat-card">
          <span class="label">Índice de Coincidencia</span>
          <span class="value">${res.ic.indice === null ? "N/A" : res.ic.indice.toFixed(6)}</span>
        </div>
        <div class="stat-card" style="grid-column: 1 / -1;">
          <span class="label">Frecuencia absoluta y relativa</span>
          <div class="table-wrap">${renderizarTablaFrecuencias(res.tablaFrecuencias)}</div>
        </div>
      `;

      // 3. Método seleccionado
      if (res.tipoCifrado === "mono") {
        metodoBox.innerHTML = `
          <p><strong>Tipo de cifrado probable:</strong> Sustitución monoalfabética</p>
          <p><strong>Métodos evaluados:</strong> César y Afín</p>
          <p class="kv"><em>Heurística: IC (${res.ic.indice.toFixed(6)}) > 0.060.</em></p>
        `;
      } else {
        metodoBox.innerHTML = `
          <p><strong>Tipo de cifrado probable:</strong> Cifrado polialfabético</p>
          <p><strong>Método evaluado:</strong> Vigenère mediante Kasiski</p>
          <p class="kv"><em>Heurística: IC (${res.ic.indice.toFixed(6)}) ≤ 0.060.</em></p>
        `;
      }

      // 4. Resultado del método ganador
      const met = res.resultadoMetodo;
      textoDescifradoActual = met.textoDescifrado || "";

      let rankingHtml = "";
      if (met.tipo === "mono") {
        rankingHtml = met.ranking
          .map(
            (item) => `
            <tr>
              <td>${met.metodoGanador === "César" ? item.desplazamiento : `${item.a}, ${item.b}`}</td>
              <td>${item.puntuacion.toFixed(3)}</td>
              <td>${item.candidato}</td>
            </tr>
          `
          )
          .join("");
      } else {
        rankingHtml = met.ranking
          .map(
            (item) => `
            <tr>
              <td>${item.longitud}</td>
              <td>${item.clave}</td>
              <td>${item.puntuacion.toFixed(3)}</td>
            </tr>
          `
          )
          .join("");
      }

      resultadoMetodo.innerHTML = `
        <div class="result-content">
          <div class="result-header">
            <h3>MÉTODO: ${met.metodoGanador.toUpperCase()}</h3>
          </div>
          ${
            met.metodoGanador === "César"
              ? `<p class="kv"><strong>Desplazamiento encontrado:</strong> ${met.parametros.desplazamiento}</p>`
              : met.tipo === "mono"
              ? `<p class="kv"><strong>a =</strong> ${met.parametros.a} &nbsp;|&nbsp; <strong>b =</strong> ${met.parametros.b}</p>`
              : `<p class="kv"><strong>Longitud de clave:</strong> ${met.parametros.longitudClave || "N/A"} &nbsp;|&nbsp; <strong>Clave encontrada:</strong> ${met.parametros.clave || "N/A"}</p>`
          }
          <p class="kv"><strong>Texto cifrado:</strong></p>
          <div class="pre">${met.textoCifrado}</div>
          <p class="kv"><strong>Texto descifrado:</strong></p>
          <div class="pre">${met.textoDescifrado}</div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>${met.tipo === "mono" ? (met.metodoGanador === "César" ? "Desplazamiento" : "a / b") : "Longitud / Clave"}</th>
                  <th>Puntuación</th>
                  <th>${met.tipo === "mono" ? "Candidato" : "Puntuación N-gramas"}</th>
                </tr>
              </thead>
              <tbody>${rankingHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      copiarBtn.classList.remove("hidden");

      // 5. Detalles Técnicos
      if (met.tipo === "mono") {
        detallesContenido.innerHTML = `
          <p><strong>Índice de coincidencia:</strong> ${met.detalles.ic.toFixed(6)}</p>
          <p><strong>Heurística:</strong> ${met.detalles.heuristica}</p>
          <p><strong>Frecuencias más altas del cifrado:</strong> ${met.detalles.frecuenciaTop.map((item) => `${item.letra}(${item.frecuencia})`).join(", ")}</p>
          <p><strong>Hipótesis Afín:</strong> ${met.detalles.hipotesisAfin}</p>
          <p><strong>Resultado líder:</strong> ${met.metodoGanador} con puntuación ${met.puntuacion.toFixed(3)}</p>
        `;
      } else {
        detallesContenido.innerHTML = `
          <p><strong>Índice de coincidencia:</strong> ${met.detalles.ic.toFixed(6)}</p>
          <p><strong>Heurística:</strong> ${met.detalles.heuristica}</p>
          <p><strong>Secuencias repetidas detectadas:</strong> ${met.detalles.secuenciasRepetidas}</p>
          <p><strong>Longitudes de clave candidatas (Kasiski):</strong> ${
            met.detalles.longitudesCandidatas.map((item) => `${item.longitud}(${item.frecuencia})`).join(", ") || "Sin candidatos"
          }</p>
        `;
      }
    } catch (err) {
      mostrarAlerta("Error al procesar el criptograma en el servidor: " + err.message, "error");
    } finally {
      analizarBtn.disabled = false;
      analizarBtn.textContent = "Analizar criptograma";
    }
  }

  function limpiar() {
    input.value = "";
    ocultarAlerta();
    estadisticas.innerHTML = "";
    metodoBox.innerHTML = "";
    resultadoMetodo.innerHTML = "";
    detallesContenido.innerHTML = "";
    copiarBtn.classList.add("hidden");
    textoDescifradoActual = "";
  }

  copiarBtn.addEventListener("click", () => {
    if (!textoDescifradoActual) return;
    navigator.clipboard.writeText(textoDescifradoActual).then(() => {
      const textoOriginal = copiarBtn.textContent;
      copiarBtn.textContent = "¡Copiado!";
      setTimeout(() => {
        copiarBtn.textContent = textoOriginal;
      }, 2000);
    });
  });

  analizarBtn.addEventListener("click", analizarCriptograma);
  limpiarBtn.addEventListener("click", limpiar);
});
