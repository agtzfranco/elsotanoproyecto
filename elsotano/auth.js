// Las reservas ya no requieren cuenta: el nav solo muestra algo al staff.
fetch("/api/usuario", { credentials: "include" })
  .then((r) => r.json())
  .then((data) => {
    const area = document.getElementById("user-area");
    if (!area || !data.usuario) return;

    area.innerHTML = `
      ${data.usuario.rol === "admin" ? `<a href="admin" class="user-link">PANEL</a>` : ""}
      <span class="user-name"></span>
      <button id="logoutBtn" class="btn btn-nav">SALIR</button>`;
    area.querySelector(".user-name").textContent = data.usuario.nombre;
    area.querySelector("#logoutBtn").addEventListener("click", () => {
      fetch("/api/logout", { credentials: "include" }).then(
        () => (window.location.href = "/"),
      );
    });
  })
  .catch(() => {});
