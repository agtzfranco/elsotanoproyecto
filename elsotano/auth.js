// Pinta "Iniciar sesión" o el nombre del usuario + salir en el nav
fetch("api/usuario.php")
  .then((r) => r.json())
  .then((data) => {
    const area = document.getElementById("user-area");
    if (!area) return;

    if (data.usuario) {
      area.innerHTML = `
        <a href="mis-reservas.html" class="user-link">MIS RESERVAS</a>
        <span class="user-name"></span>
        <button id="logoutBtn" class="btn btn-nav">SALIR</button>`;
      area.querySelector(".user-name").textContent = data.usuario.nombre;
      area.querySelector("#logoutBtn").addEventListener("click", () => {
        fetch("api/logout.php").then(
          () => (window.location.href = "index.html"),
        );
      });
    } else {
      area.innerHTML = `<a href="login.html" class="btn btn-nav">INICIAR SESIÓN</a>`;
    }
  })
  .catch(() => {});
