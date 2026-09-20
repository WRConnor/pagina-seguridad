document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formRegistro");
  const alerta = document.getElementById("alertaRegistro");
  const submitBtn = document.getElementById("submitBtn");

  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get("error");
  if (errorParam) {
    mostrarAlerta(decodeURIComponent(errorParam), "error");
  }

  function mostrarAlerta(mensaje, tipo = "error") {
    alerta.textContent = mensaje;
    alerta.className = `alert ${tipo}`;
    alerta.classList.remove("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!username || !password || !confirmPassword) {
      mostrarAlerta("Por favor complete todos los campos.", "warning");
      return;
    }

    if (password.length < 6) {
      mostrarAlerta("La contraseña debe tener al menos 6 caracteres.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      mostrarAlerta("Las contraseñas no coinciden. Por favor verifíquelas.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Generando hash BCrypt y registrando...";

    try {
      const response = await fetch("/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password, confirmPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.exitoso) {
        mostrarAlerta("¡Cuenta creada exitosamente! Redirigiendo al inicio de sesión...", "info");
        setTimeout(() => {
          window.location.href = data.redirectUrl || "/login?mensaje=" + encodeURIComponent("Cuenta registrada con éxito. Ya puede ingresar.");
        }, 1500);
        return;
      }

      mostrarAlerta(data.error || "No se pudo completar el registro.", "error");
    } catch {
      mostrarAlerta("Error de comunicación con el servidor. Intente nuevamente.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Crear Cuenta";
    }
  });
});
