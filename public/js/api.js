const ApiService = (function () {
  async function request(url, options = {}) {
    const defaultHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
      // Sesión expirada o no autenticado
      window.location.href = "/login?error=" + encodeURIComponent("Sesión expirada. Inicie sesión nuevamente.");
      throw new Error("No autenticado");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Error en la solicitud: ${response.statusText}`);
    }

    return data;
  }

  async function obtenerUsuarioActual() {
    try {
      const data = await request("/api/auth/me", { method: "GET" });
      return data;
    } catch {
      return { autenticado: false, usuario: null };
    }
  }

  async function analizarCriptograma(criptograma) {
    return request("/api/crypto/analyze", {
      method: "POST",
      body: JSON.stringify({ criptograma }),
    });
  }

  async function encriptarTexto(payload) {
    return request("/api/crypto/encrypt", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function cerrarSesion() {
    try {
      await fetch("/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  async function inicializarBarraUsuario() {
    const navContainer = document.querySelector(".top-nav");
    if (!navContainer) return;

    const authData = await obtenerUsuarioActual();
    if (authData && authData.autenticado && authData.usuario) {
      const userStatusDiv = document.createElement("div");
      userStatusDiv.className = "user-status";
      userStatusDiv.innerHTML = `
        <span class="user-badge">${authData.usuario.username} (${authData.usuario.rol})</span>
        <button type="button" id="btnLogout" class="nav-link logout-btn">Cerrar sesión</button>
      `;
      navContainer.appendChild(userStatusDiv);

      document.getElementById("btnLogout")?.addEventListener("click", cerrarSesion);
    }
  }

  document.addEventListener("DOMContentLoaded", inicializarBarraUsuario);

  return {
    analizarCriptograma,
    encriptarTexto,
    obtenerUsuarioActual,
    cerrarSesion,
  };
})();
