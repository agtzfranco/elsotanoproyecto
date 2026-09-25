document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  let next = (params.get("next") || "index.html").replace(/[^\w\-./]/g, "");
  if (!next.endsWith(".html")) next = "index.html";

  // Si ya hay sesión, no lo dejes en el login
  fetch("api/usuario.php")
    .then((r) => r.json())
    .then((d) => {
      if (d.usuario) window.location.replace(next);
    });

  const tabLogin = document.getElementById("tabLogin");
  const tabReg = document.getElementById("tabRegistro");
  const formLogin = document.getElementById("loginForm");
  const formReg = document.getElementById("registroForm");
  const msg = document.getElementById("authMsg");

  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabReg.classList.remove("active");
    formLogin.style.display = "block";
    formReg.style.display = "none";
    msg.textContent = "";
  });
  tabReg.addEventListener("click", () => {
    tabReg.classList.add("active");
    tabLogin.classList.remove("active");
    formReg.style.display = "block";
    formLogin.style.display = "none";
    msg.textContent = "";
  });

  function enviar(url, payload) {
    fetch(url, {
      method: "POST",
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
        msg.textContent = "No se pudo conectar con el servidor (XAMPP).";
      });
  }

  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    enviar("api/login.php", {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPass").value,
    });
  });

  formReg.addEventListener("submit", (e) => {
    e.preventDefault();
    enviar("api/registro.php", {
      nombre: document.getElementById("regNombre").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      telefono: document.getElementById("regTel").value.trim(),
      password: document.getElementById("regPass").value,
    });
  });
});
