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

  // Todo lo que escribe el cliente se escapa antes de pintarlo.
  const esc = (t) =>
    String(t ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const d = new Date();
  const hoyISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  function fechaLarga(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }

  /* ---------- acceso ---------- */
  fetch("/api/usuario", { credentials: "include" })
    .then((r) => r.json())
    .then((u) => {
      if (!u.usuario) {
        window.location.href =
          "login";
        return;
      }
      if (u.usuario.rol !== "admin") {
        msg.textContent = "⛔ Tu cuenta no tiene permiso de administrador.";
        return;
      }
      cargar();
    });

  function cargar() {
    fetch("/api/admin?accion=reservas", { credentials: "include" })
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
    const verPasadas = $("verPasadas").checked;
    const list = $("adminList");

    let rows = all
      .slice()
      .sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
      );
    if (fF) rows = rows.filter((r) => r.fecha === fF);
    else if (!verPasadas) rows = rows.filter((r) => r.fecha >= hoyISO);
    if (fE === "bloqueo") rows = rows.filter((r) => r.servicio === "bloqueo");
    else if (fE) rows = rows.filter((r) => r.estado === fE);

    const proximas = all.filter(
      (r) =>
        r.servicio !== "bloqueo" &&
        r.estado !== "cancelada" &&
        r.fecha >= hoyISO,
    ).length;
    $("statLine").textContent = proximas
      ? `${proximas} reserva(s) próxima(s).`
      : "No hay reservas próximas.";

    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = `<p class="disp-estado">No hay reservas que mostrar.</p>`;
      return;
    }

    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "reserva-row admin-row";
      const esBloqueo = r.servicio === "bloqueo";
      const contacto = [r.nombre, r.telefono, r.email].filter(Boolean).map(esc).join(" · ");
      row.innerHTML = `
        <div class="reserva-info">
          <strong>${esc(NOMBRES[r.servicio] || r.servicio)}</strong>
          <span>${fechaLarga(r.fecha)} · ${esc(r.hora_inicio.slice(0, 5))} – ${esc(r.hora_fin.slice(0, 5))} · ${esc(r.duracion_horas)}h</span>
          ${esBloqueo ? "" : `<span>${contacto}</span>`}
          ${r.mensaje ? `<span>📝 ${esc(r.mensaje)}</span>` : ""}
        </div>
        <div class="reserva-actions">
          <span class="badge ${esc(r.estado)}">${esc(r.estado)}</span>
          ${r.estado === "pendiente" ? `<button class="btn btn-nav" data-accion="confirmar" data-id="${esc(r.id)}">✔ CONFIRMAR</button>` : ""}
          ${r.estado !== "cancelada" ? `<button class="btn btn-nav btn-cancelar" data-accion="cancelar" data-id="${esc(r.id)}">${esBloqueo ? "✖ QUITAR BLOQUEO" : "✖ CANCELAR"}</button>` : ""}
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll("button[data-accion]").forEach((b) => {
      b.addEventListener("click", () => {
        const pregunta =
          b.dataset.accion === "confirmar"
            ? "¿Confirmar esta reserva? Se le avisará al cliente por correo."
            : "¿Cancelar esto? Si es una reserva, se le avisará al cliente por correo.";
        if (!confirm(pregunta)) return;
        b.disabled = true;
        fetch("/api/admin", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: b.dataset.accion, id: b.dataset.id }),
        })
          .then((r) => r.json())
          .then((d) => {
            msg.textContent = d.ok ? "" : "Error: " + (d.error || "no se pudo actualizar.");
            cargar();
          })
          .catch(() => {
            b.disabled = false;
            msg.textContent = "No se pudo conectar con el servidor.";
          });
      });
    });
  }

  $("filtroFecha").addEventListener("change", render);
  $("filtroEstado").addEventListener("change", render);
  $("verPasadas").addEventListener("change", render);
  $("btnLimpiarFiltros").addEventListener("click", () => {
    $("filtroFecha").value = "";
    $("filtroEstado").value = "";
    $("verPasadas").checked = false;
    render();
  });

  /* ---------- reserva manual ---------- */
  for (let h = 11; h < 23; h++) {
    $("manHora").add(new Option(`${h}:00`, h));
  }
  function opcionesDuracion() {
    const inicio = Number($("manHora").value);
    const previa = Number($("manDur").value) || 1;
    $("manDur").innerHTML = "";
    for (let n = 1; inicio + n <= 23; n++) {
      $("manDur").add(new Option(`${n} hora${n > 1 ? "s" : ""} (hasta ${inicio + n}:00)`, n));
    }
    $("manDur").value = String(Math.min(previa, 23 - inicio));
  }
  function horarioSegunServicio() {
    // La renta de equipo es por día completo: no lleva hora ni duración.
    $("manHorario").hidden = $("manServicio").value === "equipo";
  }
  $("manFecha").value = hoyISO;
  $("manFecha").min = hoyISO;
  opcionesDuracion();
  $("manHora").addEventListener("change", opcionesDuracion);
  $("manServicio").addEventListener("change", horarioSegunServicio);

  $("btnReservaManual").addEventListener("click", () => {
    const boton = $("btnReservaManual");
    const manMsg = $("manMsg");
    boton.disabled = true;
    manMsg.textContent = "Guardando...";
    fetch("/api/admin", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "crear",
        servicio: $("manServicio").value,
        fecha: $("manFecha").value,
        hora: $("manHora").value,
        duracion: $("manDur").value,
        nombre: $("manNombre").value.trim(),
        telefono: $("manTelefono").value.trim(),
        email: $("manEmail").value.trim(),
        mensaje: $("manNotas").value.trim(),
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          manMsg.textContent = "Error: " + (d.error || "no se pudo guardar.");
          return;
        }
        manMsg.textContent = d.correo
          ? "✔ Reserva guardada. Le enviamos la confirmación por correo."
          : "✔ Reserva guardada y confirmada.";
        ["manNombre", "manTelefono", "manEmail", "manNotas"].forEach((id) => ($(id).value = ""));
        cargar();
      })
      .catch(() => (manMsg.textContent = "No se pudo conectar con el servidor."))
      .finally(() => (boton.disabled = false));
  });

  /* ---------- bloquear horario ---------- */
  $("btnBloquear").addEventListener("click", () => {
    fetch("/api/admin", {
      method: "POST",
      credentials: "include",
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
