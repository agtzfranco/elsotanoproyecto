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
  let listo = false;
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
        listo = true;
        render();
      })
      .catch(() => (msg.textContent = "No se pudo conectar con el servidor."));
  }

  /* ---------- listado ---------- */
  const masDias = (n) => {
    const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  };
  const mananaISO = masDias(1);
  const semanaISO = masDias(6);
  const RANGOS = {
    hoy: { texto: "Hoy", pasa: (f) => f === hoyISO },
    manana: { texto: "Mañana", pasa: (f) => f === mananaISO },
    semana: { texto: "Próximos 7 días", pasa: (f) => f >= hoyISO && f <= semanaISO },
    proximas: { texto: "Todas las próximas", pasa: (f) => f >= hoyISO },
    pasadas: { texto: "Pasadas", pasa: (f) => f < hoyISO },
  };
  let rango = "proximas";

  function diaTitulo(iso) {
    const [y, m, dd] = iso.split("-").map(Number);
    const texto = new Date(y, m - 1, dd).toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const extra = iso === hoyISO ? " · hoy" : iso === mananaISO ? " · mañana" : "";
    return texto + extra;
  }
  $("hoyLinea").textContent = diaTitulo(hoyISO).replace(" · hoy", "");

  const activa = (r) => r.servicio !== "bloqueo" && r.estado !== "cancelada";

  // WhatsApp necesita el número con lada de país; a 10 dígitos le ponemos 52.
  function whatsapp(tel) {
    let n = String(tel || "").replace(/\D/g, "");
    if (n.length === 10) n = "52" + n;
    return n.length >= 11 ? `https://wa.me/${n}` : "";
  }

  function contactoHTML(r) {
    const partes = [];
    if (r.telefono) {
      partes.push(`<a href="tel:${esc(r.telefono.replace(/[^\d+]/g, ""))}">${esc(r.telefono)}</a>`);
      const wa = whatsapp(r.telefono);
      if (wa) partes.push(`<a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`);
    }
    if (r.email) partes.push(`<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`);
    return partes.join(" · ");
  }

  function render() {
    const fF = $("filtroFecha").value;
    const fE = $("filtroEstado").value;
    const q = $("buscar").value.trim().toLowerCase();
    const list = $("adminList");

    const cuenta = (pasa) => all.filter((r) => activa(r) && pasa(r.fecha)).length;
    $("numHoy").textContent = cuenta(RANGOS.hoy.pasa);
    $("numManana").textContent = cuenta(RANGOS.manana.pasa);
    $("numSemana").textContent = cuenta(RANGOS.semana.pasa);
    $("numProximas").textContent = cuenta(RANGOS.proximas.pasa);
    document.querySelectorAll(".admin-dato").forEach((b) =>
      b.classList.toggle("activo", !fF && b.dataset.rango === rango),
    );

    let rows = all.filter((r) => (fF ? r.fecha === fF : RANGOS[rango].pasa(r.fecha)));
    if (fE === "bloqueo") rows = rows.filter((r) => r.servicio === "bloqueo");
    else if (fE === "confirmada") rows = rows.filter(activa);
    else if (fE === "cancelada") rows = rows.filter((r) => r.estado === "cancelada");
    else if (fE !== "todas") rows = rows.filter((r) => r.estado !== "cancelada");
    if (q) {
      rows = rows.filter((r) =>
        [r.nombre, r.email, r.telefono, r.mensaje].some((v) =>
          String(v || "").toLowerCase().includes(q),
        ),
      );
    }
    rows.sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio));
    // Las pasadas se leen de la más reciente hacia atrás.
    if (!fF && rango === "pasadas") rows.reverse();

    $("rangoTexto").textContent = fF ? diaTitulo(fF) : RANGOS[rango].texto;
    $("btnPasadas").hidden = rango === "pasadas" || Boolean(fF);
    $("btnLimpiarFiltros").hidden = !(fF || fE || q || rango !== "proximas");

    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = `<p class="admin-vacio">${q || fE ? "Nada coincide con la búsqueda." : "No hay nada agendado."}</p>`;
      return;
    }

    let diaActual = "";
    let grupo;
    rows.forEach((r) => {
      if (r.fecha !== diaActual) {
        diaActual = r.fecha;
        const titulo = document.createElement("h3");
        titulo.className = "admin-dia";
        titulo.textContent = diaTitulo(r.fecha);
        list.appendChild(titulo);
        grupo = document.createElement("div");
        grupo.className = "admin-grupo";
        list.appendChild(grupo);
      }
      const esBloqueo = r.servicio === "bloqueo";
      const cancelada = r.estado === "cancelada";
      const row = document.createElement("div");
      row.className = `admin-row${esBloqueo ? " es-bloqueo" : ""}${cancelada ? " es-cancelada" : ""}`;
      row.innerHTML = `
        <div class="admin-hora">
          ${r.servicio === "equipo"
            ? `<strong>Día</strong><span>completo</span>`
            : `<strong>${esc(r.hora_inicio.slice(0, 5))}</strong><span>a ${esc(r.hora_fin.slice(0, 5))}</span><span>${esc(r.duracion_horas)}h</span>`}
        </div>
        <div class="admin-info">
          <span class="admin-servicio">${esc(NOMBRES[r.servicio] || r.servicio)}${cancelada ? ` <em>cancelada</em>` : ""}${r.estado === "pendiente" ? ` <em>pendiente</em>` : ""}</span>
          ${esBloqueo ? "" : `<strong class="admin-cliente">${esc(r.nombre)}</strong>`}
          ${esBloqueo ? "" : `<span class="admin-contacto">${contactoHTML(r)}</span>`}
          ${r.mensaje ? `<span class="admin-notas">${esc(r.mensaje)}</span>` : ""}
        </div>
        <div class="admin-botones">
          ${r.estado === "pendiente" ? `<button class="admin-link" data-accion="confirmar" data-id="${esc(r.id)}">Confirmar</button>` : ""}
          ${cancelada ? "" : `<button class="admin-link admin-cancelar" data-accion="cancelar" data-id="${esc(r.id)}">${esBloqueo ? "Quitar bloqueo" : "Cancelar"}</button>`}
        </div>`;
      grupo.appendChild(row);
    });

    list.querySelectorAll("button[data-accion]").forEach((b) => {
      b.addEventListener("click", () => {
        const pregunta =
          b.dataset.accion === "confirmar"
            ? "¿Confirmar esta reserva? Se le avisará al cliente por correo."
            : b.textContent === "Quitar bloqueo"
              ? "¿Quitar este bloqueo? El horario vuelve a quedar libre en la web."
              : "¿Cancelar esta reserva? Si dejó correo, se le avisará.";
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

  document.querySelectorAll(".admin-dato").forEach((b) =>
    b.addEventListener("click", () => {
      rango = b.dataset.rango;
      $("filtroFecha").value = "";
      render();
    }),
  );
  $("btnPasadas").addEventListener("click", () => {
    rango = "pasadas";
    render();
  });
  $("filtroFecha").addEventListener("change", render);
  $("filtroEstado").addEventListener("change", render);
  $("buscar").addEventListener("input", render);
  $("btnLimpiarFiltros").addEventListener("click", () => {
    $("filtroFecha").value = "";
    $("filtroEstado").value = "";
    $("buscar").value = "";
    rango = "proximas";
    render();
  });

  // Al volver a la pestaña se recarga, por si entró una reserva nueva.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && listo) cargar();
  });

  /* ---------- abrir / cerrar formularios ---------- */
  document.querySelectorAll(".admin-abrir").forEach((b) =>
    b.addEventListener("click", () => {
      const form = $(b.dataset.abre);
      const abrir = form.hidden;
      document.querySelectorAll(".admin-abrir").forEach((o) => {
        o.setAttribute("aria-expanded", "false");
        $(o.dataset.abre).hidden = true;
      });
      form.hidden = !abrir;
      b.setAttribute("aria-expanded", String(abrir));
    }),
  );

  /* ---------- salir ---------- */
  $("logoutBtn").addEventListener("click", () => {
    fetch("/api/logout", { credentials: "include" }).then(
      () => (window.location.href = "/"),
    );
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
  for (let h = 11; h < 23; h++) {
    $("blqHora").add(new Option(`${h}:00`, h));
  }
  function duracionBloqueo() {
    const inicio = Number($("blqHora").value);
    const previa = Number($("blqDur").value) || 1;
    $("blqDur").innerHTML = "";
    for (let n = 1; inicio + n <= 23; n++) {
      const texto = inicio === 11 && n === 12 ? "Todo el día (11:00 a 23:00)" : `${n} hora${n > 1 ? "s" : ""} (hasta ${inicio + n}:00)`;
      $("blqDur").add(new Option(texto, n));
    }
    $("blqDur").value = String(Math.min(previa, 23 - inicio));
  }
  $("blqFecha").value = hoyISO;
  $("blqFecha").min = hoyISO;
  duracionBloqueo();
  $("blqHora").addEventListener("change", duracionBloqueo);

  $("btnBloquear").addEventListener("click", () => {
    const boton = $("btnBloquear");
    boton.disabled = true;
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
        $("blqMsg").textContent = d.ok
          ? "✔ Horario bloqueado en todos los servicios."
          : "Error: " + (d.error || "no se pudo bloquear.");
        if (d.ok) {
          $("blqMotivo").value = "";
          cargar();
        }
      })
      .catch(() => ($("blqMsg").textContent = "No se pudo conectar con el servidor."))
      .finally(() => (boton.disabled = false));
  });
});
