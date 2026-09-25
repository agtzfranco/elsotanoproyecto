document.addEventListener("DOMContentLoaded", () => {
  const NOMBRES = {
    "sala-ensayo": "Sala de Ensayo",
    grabacion: "Estudio de Grabación",
    podcast: "Producción de Podcast",
    fotografia: "Sesiones de Fotografía",
    equipo: "Renta de Equipo",
  };
  const list = document.getElementById("reservasList");

  function fechaLarga(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }

  function cargar() {
    fetch("api/reservas.php")
      .then((r) => r.json())
      .then((data) => {
        if (data.login) {
          window.location.href =
            "login.html?next=" + encodeURIComponent("mis-reservas.html");
          return;
        }
        if (!data.reservas.length) {
          list.innerHTML = `<p class="disp-estado">Aún no tienes reservas. <a href="reservas.html" style="color:var(--text-primary)">Haz la primera →</a></p>`;
          return;
        }
        list.innerHTML = "";
        data.reservas.forEach((r) => {
          const row = document.createElement("div");
          row.className = "reserva-row";
          row.innerHTML = `
            <div class="reserva-info">
              <strong>${NOMBRES[r.servicio] || r.servicio}</strong>
              <span>${fechaLarga(r.fecha)} · ${r.hora_inicio.slice(0, 5)} – ${r.hora_fin.slice(0, 5)}</span>
            </div>
            <div class="reserva-actions">
              <span class="badge ${r.estado}">${r.estado}</span>
              ${r.estado !== "cancelada" ? `<button class="btn btn-nav btn-cancelar" data-id="${r.id}">CANCELAR</button>` : ""}
            </div>`;
          list.appendChild(row);
        });

        list.querySelectorAll(".btn-cancelar").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (!confirm("¿Cancelar esta reserva?")) return;
            fetch("api/reservas.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accion: "cancelar", id: btn.dataset.id }),
            }).then(() => cargar());
          });
        });
      })
      .catch(() => {
        list.innerHTML = `<p class="disp-estado">No se pudo conectar con el servidor.</p>`;
      });
  }
  cargar();
});
