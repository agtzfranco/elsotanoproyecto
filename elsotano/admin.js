document.addEventListener("DOMContentLoaded", () => {
  const NOMBRES = {
    "sala-ensayo": "Sala de Ensayo",
    grabacion: "Estudio de Grabación",
    podcast: "Producción de Podcast",
    fotografia: "Renta de Estudio Fotográfico",
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
        window.location.href = "/";
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
        if (vista === "semana") renderSemana();
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
      b.classList.toggle("activo", vista === "lista" && !fF && b.dataset.rango === rango),
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
          ${cancelada || esBloqueo ? "" : `<button class="admin-link" data-mover="${esc(r.id)}">Cambiar fecha u hora</button>`}
          ${cancelada ? "" : `<button class="admin-link admin-cancelar" data-accion="cancelar" data-id="${esc(r.id)}">${esBloqueo ? "Quitar bloqueo" : "Cancelar"}</button>`}
        </div>`;
      grupo.appendChild(row);
    });

    list.querySelectorAll("button[data-mover]").forEach((b) =>
      b.addEventListener("click", () => abrirMover(b)),
    );

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
      // Desde la vista de semana, los contadores llevan a esa lista.
      if (vista === "semana") cambiarVista("lista");
      else render();
      // La lista queda más abajo: se baja hasta ella para que se note el cambio.
      const suave = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      $("vistaLista").scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
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

  /* ---------- vista de semana ---------- */
  // Cuadrícula lunes a domingo, 11:00 a 23:00, para ver de un vistazo qué
  // está ocupado y qué está libre. Al tocar una reserva se abre ese día en
  // la lista, donde están los botones.
  let vista = "lista";
  const CORTOS = {
    "sala-ensayo": "Ensayo",
    grabacion: "Grabación",
    podcast: "Podcast",
    fotografia: "Fotografía",
    equipo: "Renta de equipo",
    bloqueo: "Bloqueo",
  };
  const iso = (f) =>
    `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  const lunesDe = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate() - ((f.getDay() + 6) % 7));
  let semana = lunesDe(d);

  function renderSemana() {
    const dias = Array.from({ length: 7 }, (_, i) =>
      new Date(semana.getFullYear(), semana.getMonth(), semana.getDate() + i),
    );
    const mes = (f) => f.toLocaleDateString("es-MX", { month: "long" });
    const ini = dias[0];
    const fin = dias[6];
    $("semTitulo").textContent =
      mes(ini) === mes(fin)
        ? `${ini.getDate()} – ${fin.getDate()} de ${mes(fin)}`
        : `${ini.getDate()} de ${mes(ini)} – ${fin.getDate()} de ${mes(fin)}`;
    $("semHoy").hidden = iso(semana) === iso(lunesDe(d));

    const grid = $("semGrid");
    let html = `<div class="sem-esquina"></div>`;
    dias.forEach((f) => {
      const hoy = iso(f) === hoyISO;
      html += `<div class="sem-dia${hoy ? " es-hoy" : ""}"><span>${f.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "")}</span><strong>${f.getDate()}</strong></div>`;
    });

    // Fila de "todo el día" para la renta de equipo.
    html += `<div class="sem-hora sem-hora-dia">Día</div>`;
    dias.forEach((f) => {
      const enDia = all.filter((r) => r.fecha === iso(f) && r.servicio === "equipo" && r.estado !== "cancelada");
      html += `<div class="sem-todo-dia">${enDia
        .map((r) => `<button class="sem-evento sem-chip" data-fecha="${esc(r.fecha)}" title="${esc(r.nombre)}">${esc(CORTOS.equipo)} · ${esc(r.nombre)}</button>`)
        .join("")}</div>`;
    });

    html += `<div class="sem-horas">${Array.from({ length: 12 }, (_, i) => `<span>${11 + i}:00</span>`).join("")}</div>`;
    dias.forEach((f) => {
      const fecha = iso(f);
      const eventos = all
        .filter((r) => r.fecha === fecha && r.servicio !== "equipo" && r.estado !== "cancelada")
        .map((r) => ({ r, a: parseInt(r.hora_inicio, 10), b: parseInt(r.hora_fin, 10) }))
        .sort((x, y) => x.a - y.a || y.b - x.b);
      // Reservas a la misma hora (servicios distintos) van lado a lado.
      const carriles = [];
      eventos.forEach((e) => {
        let c = carriles.findIndex((fin) => fin <= e.a);
        if (c === -1) c = carriles.push(0) - 1;
        carriles[c] = e.b;
        e.carril = c;
      });
      const n = Math.max(1, carriles.length);
      html += `<div class="sem-col${fecha === hoyISO ? " es-hoy" : ""}${fecha < hoyISO ? " es-pasado" : ""}">${eventos
        .map(({ r, a, b, carril }) => {
          const bloqueo = r.servicio === "bloqueo";
          return `<button class="sem-evento${bloqueo ? " es-bloqueo" : ""}" data-fecha="${esc(r.fecha)}"
            style="top:calc(${a - 11} * var(--sem-h));height:calc(${b - a} * var(--sem-h) - 3px);left:calc(${carril} * 100% / ${n});width:calc(100% / ${n} - 3px)">
            <span>${esc(r.hora_inicio.slice(0, 5))}–${esc(r.hora_fin.slice(0, 5))}</span>
            <strong>${esc(CORTOS[r.servicio] || r.servicio)}</strong>
            ${bloqueo ? (r.mensaje ? `<em>${esc(r.mensaje)}</em>` : "") : `<em>${esc(r.nombre)}</em>`}
          </button>`;
        })
        .join("")}</div>`;
    });
    grid.innerHTML = html;
    // En celular la semana no cabe: se abre ya desplazada hasta hoy.
    const colHoy = grid.querySelector(".sem-dia.es-hoy");
    const caja = grid.parentElement;
    caja.scrollLeft = colHoy ? colHoy.offsetLeft - grid.querySelector(".sem-esquina").offsetWidth : 0;

    grid.querySelectorAll(".sem-evento").forEach((b) =>
      b.addEventListener("click", () => {
        $("filtroFecha").value = b.dataset.fecha;
        $("filtroEstado").value = "";
        $("buscar").value = "";
        cambiarVista("lista");
      }),
    );
  }

  function cambiarVista(v) {
    vista = v;
    document.querySelectorAll(".admin-vista button").forEach((b) => {
      const activo = b.dataset.vista === v;
      b.classList.toggle("activo", activo);
      b.setAttribute("aria-pressed", String(activo));
    });
    $("vistaLista").hidden = v !== "lista";
    $("vistaSemana").hidden = v !== "semana";
    render();
    if (v === "semana") renderSemana();
  }
  document.querySelectorAll(".admin-vista button").forEach((b) =>
    b.addEventListener("click", () => cambiarVista(b.dataset.vista)),
  );
  $("semAnterior").addEventListener("click", () => {
    semana = new Date(semana.getFullYear(), semana.getMonth(), semana.getDate() - 7);
    renderSemana();
  });
  $("semSiguiente").addEventListener("click", () => {
    semana = new Date(semana.getFullYear(), semana.getMonth(), semana.getDate() + 7);
    renderSemana();
  });
  $("semHoy").addEventListener("click", () => {
    semana = lunesDe(d);
    renderSemana();
  });

  /* ---------- cambiar fecha u hora ---------- */
  // Abre, dentro de la misma fila, un mini formulario con la reserva actual
  // ya seleccionada. Al guardar, el servidor revisa que el nuevo horario
  // esté libre y le avisa al cliente.
  function abrirMover(boton) {
    const fila = boton.closest(".admin-row");
    const abierto = fila.querySelector(".admin-mover");
    document.querySelectorAll(".admin-mover").forEach((f) => f.remove());
    if (abierto) return;
    const r = all.find((x) => String(x.id) === boton.dataset.mover);
    if (!r) return;
    const porDia = r.servicio === "equipo";
    const ini = parseInt(r.hora_inicio, 10);
    const caja = document.createElement("div");
    caja.className = "admin-mover";
    caja.innerHTML = `
      <div class="form-group">
        <label>Nueva fecha</label>
        <input type="date" class="mv-fecha" min="${hoyISO}" value="${esc(r.fecha)}" />
      </div>
      ${porDia ? "" : `
      <div class="form-group">
        <label>Hora de inicio</label>
        <select class="mv-hora"></select>
      </div>
      <div class="form-group">
        <label>Duración</label>
        <select class="mv-dur"></select>
      </div>`}
      <div class="admin-mover-botones">
        <button class="btn mv-guardar">GUARDAR CAMBIO</button>
        <button class="admin-link mv-cerrar">Cerrar</button>
      </div>
      <p class="disp-estado mv-msg" role="status"></p>`;
    fila.appendChild(caja);

    const selHora = caja.querySelector(".mv-hora");
    const selDur = caja.querySelector(".mv-dur");
    if (selHora) {
      for (let h = 11; h < 23; h++) selHora.add(new Option(`${h}:00`, h));
      selHora.value = String(ini);
      const duraciones = (previa) => {
        const inicio = Number(selHora.value);
        selDur.innerHTML = "";
        for (let n = 1; inicio + n <= 23; n++) {
          selDur.add(new Option(`${n} hora${n > 1 ? "s" : ""} (hasta ${inicio + n}:00)`, n));
        }
        selDur.value = String(Math.min(previa, 23 - inicio));
      };
      duraciones(Number(r.duracion_horas) || 1);
      selHora.addEventListener("change", () => duraciones(Number(selDur.value) || 1));
    }

    caja.querySelector(".mv-cerrar").addEventListener("click", () => caja.remove());
    caja.querySelector(".mv-guardar").addEventListener("click", () => {
      const guardar = caja.querySelector(".mv-guardar");
      const aviso = caja.querySelector(".mv-msg");
      const fecha = caja.querySelector(".mv-fecha").value;
      if (!fecha) {
        aviso.textContent = "Elige la nueva fecha.";
        return;
      }
      guardar.disabled = true;
      aviso.textContent = "Guardando…";
      fetch("/api/admin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "mover",
          id: r.id,
          fecha,
          hora: selHora ? selHora.value : 11,
          duracion: selDur ? selDur.value : 12,
        }),
      })
        .then((x) => x.json())
        .then((d) => {
          if (!d.ok) {
            guardar.disabled = false;
            aviso.textContent = d.error || "No se pudo mover la reserva.";
            return;
          }
          msg.textContent = d.correo
            ? `✓ Reserva de ${r.nombre} movida. Le avisamos por correo.`
            : `✓ Reserva de ${r.nombre} movida.`;
          cargar();
        })
        .catch(() => {
          guardar.disabled = false;
          aviso.textContent = "No se pudo conectar con el servidor.";
        });
    });
  }

  /* ---------- respaldo en Excel ---------- */
  // Descarga TODAS las reservas (pasadas, futuras y canceladas) en un CSV
  // que Excel abre directo. Sirve como respaldo fuera de Supabase.
  $("btnExportar").addEventListener("click", () => {
    if (!listo) return;
    const celda = (v) => {
      let t = String(v ?? "");
      // Evita que Excel interprete un texto del cliente como fórmula.
      if (/^[=+\-@]/.test(t)) t = "'" + t;
      return `"${t.replace(/"/g, '""')}"`;
    };
    const hora = (h) => String(h || "").slice(0, 5);
    const filas = [
      ["Folio", "Fecha", "Inicio", "Fin", "Horas", "Servicio", "Nombre", "Teléfono", "Correo", "Notas", "Estado"],
      ...[...all]
        .sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio))
        .map((r) => [
          r.id,
          r.fecha,
          hora(r.hora_inicio),
          hora(r.hora_fin),
          r.duracion_horas,
          NOMBRES[r.servicio] || r.servicio,
          r.nombre,
          r.telefono,
          r.email,
          r.mensaje,
          r.servicio === "bloqueo" ? "bloqueo" : r.estado,
        ]),
    ];
    // El BOM inicial hace que Excel respete acentos y la ñ.
    const csv = "\ufeff" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas-el-sotano-${hoyISO}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
