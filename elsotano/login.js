document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  // Solo páginas propias del sitio (p. ej. "admin"), nunca otro dominio.
  let next = (params.get("next") || "admin").replace(/\.html$/, "");
  if (!/^[a-z-]+$/.test(next)) next = "admin";

  // Si ya hay sesión, no lo dejes en el login
  fetch("/api/usuario", { credentials: "include" })
    .then((r) => r.json())
    .then((d) => {
      if (d.usuario) window.location.replace(next);
    });

  const formLogin = document.getElementById("loginForm");
  const msg = document.getElementById("authMsg");

  function enviar(url, payload) {
    fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          msg.style.color = "var(--text-primary)";
          msg.textContent = "¡Listo! Redirigiendo...";
          setTimeout(() => (window.location.href = next), 600);
        } else {
          msg.style.color = "var(--error)";
          msg.textContent = data.error;
        }
      })
      .catch(() => {
        msg.style.color = "var(--error)";
        msg.textContent = "No se pudo conectar con el servidor.";
      });
  }

  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    enviar("/api/login", {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPass").value,
    });
  });
});
