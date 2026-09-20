document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formLogin");
  const alerta = document.getElementById("alertaLogin");
  const submitBtn = document.getElementById("submitBtn");
  let timerInterval = null;

  // Leer posibles errores o mensajes informativos pasados por query string
  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get("error");
  const mensajeParam = urlParams.get("mensaje");

  if (errorParam) {
    mostrarAlerta(decodeURIComponent(errorParam), "error");
  } else if (mensajeParam) {
    mostrarAlerta(decodeURIComponent(mensajeParam), "info");
  }

  function mostrarAlerta(mensaje, tipo = "error") {
    alerta.textContent = mensaje;
    alerta.className = `alert ${tipo}`;
    alerta.classList.remove("hidden");
  }

  function iniciarCuentaRegresiva(segundos) {
    let restante = segundos;
    submitBtn.disabled = true;

    if (timerInterval) clearInterval(timerInterval);

    const actualizarTexto = () => {
      if (restante <= 0) {
        clearInterval(timerInterval);
        submitBtn.disabled = false;
        mostrarAlerta("El tiempo de bloqueo ha finalizado. Puede intentar iniciar sesión nuevamente.", "info");
        return;
      }
      mostrarAlerta(
        `Demasiados intentos fallidos. Su IP ha sido bloqueada temporalmente. Intente de nuevo en ${restante} segundos. (HTTP 429)`,
        "error"
      );
      restante -= 1;
    };

    actualizarTexto();
    timerInterval = setInterval(actualizarTexto, 1000);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      mostrarAlerta("Por favor complete todos los campos.", "warning");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando credenciales...";

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 429) {
        // Bloqueo perimetral por fuerza bruta activo
        const segs = data.segundosRestantes || 900;
        iniciarCuentaRegresiva(segs);
        submitBtn.textContent = "Iniciar Sesión";
        return;
      }

      if (response.ok && data.exitoso) {
        mostrarAlerta("Autenticación exitosa. Redirigiendo...", "info");
        window.location.href = data.redirectUrl || "/";
        return;
      }

      // Credenciales inválidas u otro error
      const mensaje = data.error || "Credenciales incorrectas.";
      const infoIntentos = data.intentosRestantes !== undefined
        ? ` (Intentos restantes antes de bloqueo: ${data.intentosRestantes})`
        : "";
      mostrarAlerta(`${mensaje}${infoIntentos}`, "error");
    } catch (err) {
      mostrarAlerta("Error de comunicación con el servidor. Intente nuevamente.", "error");
    } finally {
      if (!timerInterval || submitBtn.disabled === false) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Iniciar Sesión";
      }
    }
  });
});
