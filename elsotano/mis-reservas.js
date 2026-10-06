document.addEventListener("DOMContentLoaded", () => {
  const NOMBRES = {
    "sala-ensayo": "Sala de Ensayo",
    grabacion: "Estudio de Grabación",
    podcast: "Producción de Podcast",
    fotografia: "Sesiones de Fotografía",
    equipo: "Renta de Equipo",
  };
  const list = document.getElementById("reservasList");
  // Link limpio: /mis-reservas/<token> (antes /mis-reservas?token=...)
  const token =
    decodeURIComponent(window.location.pathname.split("/")[2] || "") ||
    new URLSearchParams(window.location.search).get("token") ||
    "";

  function fechaLarga(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }

  function aviso(texto) {
    list.innerHTML = "";
    const p = document.createElement("p");
    p.className = "disp-estado";
    p.textContent = texto;
    list.appendChild(p);
  }

  function cargar() {
    if (!token) {
      aviso("Abre el enlace que te enviamos por correo al reservar para ver tu reserva.");
      return;
    }
    fetch(`/api/reservas?token=${encodeURIComponent(token)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          aviso(data.error || "No se pudo cargar la reserva.");
          return;
        }
        const r = data.reserva;
        const row = document.createElement("div");
        row.className = "reserva-row";
        row.innerHTML = `
          <div class="reserva-info">
            <strong></strong>
            <span></span>
            <span></span>
          </div>
          <div class="reserva-actions">
            <span class="badge"></span>
            ${r.cancelable ? `<button class="btn btn-nav btn-cancelar">CANCELAR</button>` : ""}
          </div>`;
        const [titulo, horario, nombre] = row.querySelectorAll(".reserva-info > *");
        titulo.textContent = NOMBRES[r.servicio] || r.servicio;
        horario.textContent = `${fechaLarga(r.fecha)} · ${r.hora_inicio.slice(0, 5)} – ${r.hora_fin.slice(0, 5)}`;
        nombre.textContent = `A nombre de ${r.nombre}`;
        const badge = row.querySelector(".badge");
        badge.classList.add(r.estado);
        badge.textContent = r.estado;

        list.innerHTML = "";
        list.appendChild(row);

        const btn = row.querySelector(".btn-cancelar");
        if (btn) {
          btn.addEventListener("click", () => {
            if (!confirm("¿Cancelar esta reserva?")) return;
            btn.disabled = true;
            fetch("/api/reservas", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accion: "cancelar", token }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (!d.ok) alert(d.error || "No se pudo cancelar la reserva.");
                cargar();
              })
              .catch(() => {
                btn.disabled = false;
                alert("No se pudo conectar con el servidor.");
              });
          });
        }
      })
      .catch(() => aviso("No se pudo conectar con el servidor."));
  }
  cargar();
});
