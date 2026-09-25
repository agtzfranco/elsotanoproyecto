document.addEventListener("DOMContentLoaded", () => {
  const NOMBRES = {
    "sala-ensayo": "Sala de Ensayo",
    grabacion: "Estudio de Grabación",
    podcast: "Producción de Podcast",
    fotografia: "Sesiones de Fotografía",
    equipo: "Renta de Equipo",
    bloqueo: "BLOQUEO DE STAFF",
  };
  let all = [];
  const $ = (id) => document.getElementById(id);
  const msg = $("adminMsg");

  function fechaLarga(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }

  /* ---------- acceso ---------- */
  fetch("api/usuario.php")
    .then((r) => r.json())
    .then((u) => {
      if (!u.usuario) {
        window.location.href =
          "login.html?next=" + encodeURIComponent("admin.html");
        return;
      }
      if (u.usuario.rol !== "admin") {
        msg.textContent = "⛔ Tu cuenta no tiene permiso de administrador.";
        return;
      }
      cargar();
    });

  function cargar() {
    fetch("api/admin.php?accion=reservas")
      .then((r) => r.json())
      .then((data) => {
        all = data.reservas || [];
        render();
      })
      .catch(() => (msg.textContent = "No se pudo conectar con el servidor."));
  }

  /* ---------- listado ---------- */
  function render() {
    const fF = $("filtroFecha").value;
    const fE = $("filtroEstado").value;
    const list = $("adminList");

    let rows = all
      .slice()
      .sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
      );
    if (fF) rows = rows.filter((r) => r.fecha === fF);
    if (fE === "bloqueo") rows = rows.filter((r) => r.servicio === "bloqueo");
    else if (fE) rows = rows.filter((r) => r.estado === fE);

    const pend = all.filter((r) => r.estado === "pendiente").length;
    $("statLine").textContent = pend
      ? `⚠ ${pend} reserva(s) pendiente(s) por confirmar.`
      : "✔ No hay pendientes.";

    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = `<p class="disp-estado">No hay reservas que mostrar.</p>`;
      return;
    }

    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "reserva-row admin-row";
      row.innerHTML = `
        <div class="reserva-info">
          <strong>${NOMBRES[r.servicio] || r.servicio}</strong>
          <span>${fechaLarga(r.fecha)} · ${r.hora_inicio.slice(0, 5)} – ${r.hora_fin.slice(0, 5)} · ${r.duracion_horas}h</span>
          <span>${r.nombre}${r.telefono ? " · " + r.telefono : ""}${r.email ? " · " + r.email : ""}</span>
          ${r.mensaje ? `<span>📝 ${r.mensaje}</span>` : ""}
        </div>
        <div class="reserva-actions">
          <span class="badge ${r.estado}">${r.estado}</span>
          ${r.estado === "pendiente" ? `<button class="btn btn-nav" data-accion="confirmar" data-id="${r.id}">✔ CONFIRMAR</button>` : ""}
          ${r.estado !== "cancelada" ? `<button class="btn btn-nav btn-cancelar" data-accion="cancelar" data-id="${r.id}">✖ CANCELAR</button>` : ""}
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll("button[data-accion]").forEach((b) => {
      b.addEventListener("click", () => {
        fetch("api/admin.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: b.dataset.accion, id: b.dataset.id }),
        }).then(() => cargar());
      });
    });
  }

  $("filtroFecha").addEventListener("change", render);
  $("filtroEstado").addEventListener("change", render);
  $("btnLimpiarFiltros").addEventListener("click", () => {
    $("filtroFecha").value = "";
    $("filtroEstado").value = "";
    render();
  });

  /* ---------- bloquear horario ---------- */
  $("btnBloquear").addEventListener("click", () => {
    fetch("api/admin.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "bloquear",
        fecha: $("blqFecha").value,
        hora: $("blqHora").value,
        duracion: $("blqDur").value,
        motivo: $("blqMotivo").value.trim(),
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        msg.textContent = d.ok
          ? "✔ Horario bloqueado en todos los servicios."
          : "Error: " + d.error;
        if (d.ok) {
          $("blqMotivo").value = "";
          cargar();
        }
      });
  });
});
