document.addEventListener("DOMContentLoaded", () => {
  const metodoSelect = document.getElementById("metodoCifrado");
  const desplazamientoInput = document.getElementById("desplazamiento");
  const claveAInput = document.getElementById("claveA");
  const claveBInput = document.getElementById("claveB");
  const claveVigenereInput = document.getElementById("claveVigenere");
  const textoPlanoInput = document.getElementById("textoPlano");
  const resultadoCifrado = document.getElementById("resultadoCifrado");
  const encriptarBtn = document.getElementById("encriptarBtn");
  const limpiarBtn = document.getElementById("limpiarEncriptadoBtn");

  function actualizarCamposPorMetodo() {
    const metodo = metodoSelect.value;
    const mostrarCesar = metodo === "cesar";
    const mostrarAfin = metodo === "afin";
    const mostrarVigenere = metodo === "vigenere";

    document.getElementById("grupoDesplazamiento").classList.toggle("hidden-field", !mostrarCesar);
    document.getElementById("grupoAfinA").classList.toggle("hidden-field", !mostrarAfin);
    document.getElementById("grupoAfinB").classList.toggle("hidden-field", !mostrarAfin);
    document.getElementById("grupoClaveVigenere").classList.toggle("hidden-field", !mostrarVigenere);
  }

  async function encriptarTexto() {
    const texto = textoPlanoInput.value.trim();
    if (!texto) {
      resultadoCifrado.textContent = "Escribe un texto para cifrar.";
      return;
    }

    const metodo = metodoSelect.value;
    const payload = {
      metodo,
      texto,
    };

    if (metodo === "cesar") {
      payload.desplazamiento = Number(desplazamientoInput.value);
    } else if (metodo === "afin") {
      payload.a = Number(claveAInput.value);
      payload.b = Number(claveBInput.value);
    } else if (metodo === "vigenere") {
      payload.clave = claveVigenereInput.value;
    }

    encriptarBtn.disabled = true;
    encriptarBtn.textContent = "Cifrando...";

    try {
      const data = await ApiService.encriptarTexto(payload);
      resultadoCifrado.textContent = data.cifrado;
    } catch (err) {
      resultadoCifrado.textContent = "Error: " + err.message;
    } finally {
      encriptarBtn.disabled = false;
      encriptarBtn.textContent = "Encriptar";
    }
  }

  function limpiarEncriptado() {
    textoPlanoInput.value = "";
    resultadoCifrado.textContent = "Aquí aparecerá el resultado del cifrado.";
  }

  metodoSelect.addEventListener("change", actualizarCamposPorMetodo);
  encriptarBtn.addEventListener("click", encriptarTexto);
  limpiarBtn.addEventListener("click", limpiarEncriptado);

  actualizarCamposPorMetodo();
});
