document.addEventListener("DOMContentLoaded", () => {
  const SERVICIOS = [
    {
      id: "sala-ensayo",
      nombre: "Sala de Ensayo",
      img: "IMG/5.jpg",
      precio: 250,
      precioLabel: "$250 <span>MXN / hora</span>",
      desc: "Monitoreo personal con mezcla individual y grabación multipista.",
    },
    {
      id: "grabacion",
      nombre: "Estudio de Grabación",
      img: "IMG/estudio-grabacion.jpg",
      precio: null,
      precioLabel: "Cotizar <span>por proyecto</span>",
      desc: "Grabación, mezcla y masterización con asesoría técnica.",
    },
    {
      id: "podcast",
      nombre: "Producción de Podcast",
      img: "IMG/3.jpg",
      precio: 800,
      precioLabel: "Desde $800 <span>MXN / hora</span>",
      desc: "Audio o audio + video con microfonía profesional.",
    },
    {
      id: "fotografia",
      nombre: "Sesiones de Fotografía",
      img: "IMG/fotografiaelsotano.jpg",
      precio: 350,
      precioLabel: "$350 <span>MXN / hora</span>",
      desc: "Fondos intercambiables e iluminación profesional.",
    },
    {
      id: "equipo",
      nombre: "Renta de Equipo",
      img: "IMG/3.jpg",
      precio: 9000,
      porDia: true,
      precioLabel: "$9,000 <span>MXN / día</span>",
      desc: "Paquete completo con transporte, montaje y operación.",
    },
  ];
  const MESES = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  let state = { servicio: null, fecha: null, hora: null, maxDur: 1 };
  let calOffset = 0;

  const $ = (id) => document.getElementById(id);

  // Recordamos los datos de contacto en este navegador para la próxima reserva.
  const CONTACTO_KEY = "elsotano-contacto";
  try {
    const guardado = JSON.parse(localStorage.getItem(CONTACTO_KEY) || "{}");
    $("resNombre").value = guardado.nombre || "";
    $("resEmail").value = guardado.email || "";
    $("resTel").value = guardado.telefono || "";
  } catch {}
  const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // "martes, 29 de septiembre" (como el calendario de referencia)
  function fechaTexto(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function fechaLarga(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }

  /* ---------- PASO 1: servicios ---------- */
  const wrap = $("bookingServices");
  SERVICIOS.forEach((s) => {
    const card = document.createElement("article");
    card.className = "service-card bservice-card";
    card.innerHTML = `
      <div class="card-img"><img src="${s.img}" alt="${s.nombre}" loading="lazy"></div>
      <div class="card-content"><h3>${s.nombre}</h3><p>${s.desc}</p><div class="price">${s.precioLabel}</div></div>
      <div class="card-footer"><button class="btn btn-full" data-id="${s.id}">ELEGIR</button></div>`;
    wrap.appendChild(card);
  });

  function seleccionarServicio(id) {
    const s = SERVICIOS.find((x) => x.id === id);
    if (!s) return;
    state.servicio = s;
    state.fecha = null;
    state.hora = null;
    document
      .querySelectorAll(".bservice-card")
      .forEach((c) => c.classList.remove("selected"));
    const btnSel = wrap.querySelector(`button[data-id="${id}"]`);
    if (btnSel) btnSel.closest(".bservice-card").classList.add("selected");
    $("stepFecha").hidden = false;
    $("stepConfirm").hidden = true;
    renderCalendar();
  }

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    seleccionarServicio(btn.dataset.id);
    $("stepFecha").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- BLINDADO: oculta paso 1 sin depender de wrappers ---------- */
  // El título del paso 1 es el elemento hermano justo antes del grid
  const paso1Els = [wrap.previousElementSibling, wrap].filter(Boolean);

  // Si el botón "cambiar servicio" no existe en el HTML, lo creamos
  let btnCambiar = $("btnCambiarServicio");
  if (!btnCambiar) {
    btnCambiar = document.createElement("button");
    btnCambiar.id = "btnCambiarServicio";
    btnCambiar.className = "btn btn-nav";
    btnCambiar.style.marginLeft = "1.5rem";
    btnCambiar.textContent = "← CAMBIAR SERVICIO";
    const titulo2 = $("stepFecha").querySelector(".step-title");
    if (titulo2) titulo2.appendChild(btnCambiar);
  }
  btnCambiar.hidden = true;

  function ocultarPaso1() {
    paso1Els.forEach((el) => (el.style.display = "none"));
    btnCambiar.hidden = false;
  }
  function mostrarPaso1() {
    paso1Els.forEach((el) => (el.style.display = ""));
    btnCambiar.hidden = true;
    if (paso1Els[0]) paso1Els[0].scrollIntoView({ behavior: "smooth" });
  }

  const servicioPre = new URLSearchParams(window.location.search).get(
    "servicio",
  );
  if (servicioPre && SERVICIOS.some((s) => s.id === servicioPre)) {
    seleccionarServicio(servicioPre);
    ocultarPaso1();
    if (state.servicio.porDia) {
      // La renta de equipo se aparta por día completo, sin elegir hora.
      const titulo = document.querySelector("#stepFecha .step-title");
      titulo.childNodes.forEach((n) => {
        if (n.nodeType === 3 && n.textContent.includes("ELIGE FECHA"))
          n.textContent = " ELIGE EL DÍA ";
      });
      const intro = document.querySelector("#booking .section-intro");
      if (intro)
        intro.textContent =
          "Aparta el día de tu evento en el calendario y déjanos tu nombre, correo y teléfono.";
    }
    window.scrollTo(0, 0); // la página abre arriba: título + calendario
  } else {
    // Sin servicio elegido: el cliente elige en la página de inicio
    window.location.replace("index.html#servicios");
  }

  btnCambiar.addEventListener("click", () => {
    window.location.href = "index.html#servicios";
  });

  /* ---------- PASO 2: calendario ---------- */
  function renderCalendar() {
    const base = new Date(hoy.getFullYear(), hoy.getMonth() + calOffset, 1);
    $("calTitle").textContent =
      `${MESES[base.getMonth()]} ${base.getFullYear()}`;
    const grid = $("calGrid");
    grid.innerHTML = "";
    const firstDay = (base.getDay() + 6) % 7; // lunes = 0
    const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++)
      grid.appendChild(document.createElement("span"));
    for (let d = 1; d <= days; d++) {
      const dateObj = new Date(base.getFullYear(), base.getMonth(), d);
      const iso = toISO(dateObj);
      const btn = document.createElement("button");
      btn.className = "cal-day";
      btn.textContent = d;
      if (dateObj < hoy) btn.disabled = true;
      if (state.fecha === iso) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        state.fecha = iso;
        state.hora = null;
        document
          .querySelectorAll(".cal-day")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        $("stepConfirm").hidden = true;
        cargarSlots();
      });
      grid.appendChild(btn);
    }
  }
  $("calPrev").addEventListener("click", () => {
    if (calOffset > 0) {
      calOffset--;
      renderCalendar();
    }
  });
  $("calNext").addEventListener("click", () => {
    if (calOffset < 3) {
      calOffset++;
      renderCalendar();
    }
  });

  // Horas seguidas libres desde el slot i hasta el cierre o la siguiente reserva.
  function horasLibresDesde(slots, i) {
    let n = 0;
    while (slots[i + n] && !slots[i + n].ocupado) n++;
    return n;
  }

  function cargarSlots(conservar = false) {
    const grid = $("slots-grid");
    if (!conservar) {
      grid.innerHTML = "";
      $("disp-estado").textContent = "Cargando horarios...";
    }
    fetch(
      `/api/disponibilidad?servicio=${encodeURIComponent(state.servicio.id)}&fecha=${state.fecha}`,
      { credentials: "include" },
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          $("disp-estado").textContent = "Error: " + data.error;
          return;
        }
        // Si es hoy, las horas que ya empezaron no se pueden reservar.
        const ahora = new Date();
        if (state.fecha === toISO(ahora)) {
          data.slots.forEach((slot) => {
            if (parseInt(slot.hora, 10) <= ahora.getHours())
              slot.ocupado = true;
          });
        }
        // La renta de equipo es por día: el día completo tiene que estar libre.
        if (state.servicio.porDia) {
          mostrarDiaCompleto(data.slots.every((x) => !x.ocupado), conservar);
          return;
        }
        const libres = data.slots.filter((s) => !s.ocupado).length;
        $("disp-estado").textContent = libres
          ? `Disponibilidad para: ${fechaTexto(state.fecha)}`
          : `Disponibilidad para: ${fechaTexto(state.fecha)} · No hay horarios libres`;
        grid.innerHTML = "";
        const elegido = data.slots.find(
          (x) => x.hora === state.hora && !x.ocupado,
        );
        if (conservar && state.hora && !elegido) {
          // La hora elegida ya pasó o alguien más la tomó.
          state.hora = null;
          $("stepConfirm").hidden = true;
        }
        data.slots.forEach((slot, i) => {
          const b = document.createElement("button");
          b.className = "slot " + (slot.ocupado ? "ocupado" : "libre");
          b.textContent = slot.hora;
          b.disabled = slot.ocupado;
          if (conservar && slot === elegido) {
            b.classList.add("elegido");
            state.maxDur = horasLibresDesde(data.slots, i);
            if (!$("stepConfirm").hidden) actualizarDuraciones();
          }
          if (!slot.ocupado)
            b.addEventListener("click", () => {
              state.hora = slot.hora;
              state.maxDur = horasLibresDesde(data.slots, i);
              document
                .querySelectorAll(".slot")
                .forEach((x) => x.classList.remove("elegido"));
              b.classList.add("elegido");
              mostrarConfirmacion();
            });
          grid.appendChild(b);
        });
      })
      .catch(
        () =>
          ($("disp-estado").textContent =
            "No se pudo conectar con el servidor."),
      );
  }

  function mostrarDiaCompleto(libre, conservar) {
    const grid = $("slots-grid");
    grid.innerHTML = "";
    $("disp-estado").textContent = libre
      ? `Disponibilidad para: ${fechaTexto(state.fecha)}`
      : `Disponibilidad para: ${fechaTexto(state.fecha)} · Ese día ya está ocupado`;
    const b = document.createElement("button");
    b.className = "slot slot-dia " + (libre ? "libre elegido" : "ocupado");
    b.textContent = libre ? "DÍA COMPLETO · 11:00 – 23:00" : "NO DISPONIBLE";
    b.disabled = !libre;
    grid.appendChild(b);
    if (!libre) {
      state.hora = null;
      $("stepConfirm").hidden = true;
      return;
    }
    state.hora = "11:00";
    if (!conservar) mostrarConfirmacion();
  }

  // Tiempo real: cada minuto se vuelve a consultar la disponibilidad del día
  // elegido, así desaparecen las horas que van pasando y las que alguien reserva.
  setInterval(() => {
    if (state.servicio && state.fecha && !document.hidden) cargarSlots(true);
  }, 60 * 1000);

  /* ---------- PASO 3: confirmación ---------- */
  function mostrarConfirmacion() {
    const s = state.servicio;
    $("duracionGroup").style.display = s.porDia ? "none" : "block";
    actualizarDuraciones();
    $("stepConfirm").hidden = false;
    $("confirmMsg").textContent = "";
    const reg = window.REGLAMENTOS && window.REGLAMENTOS[s.id];
    $("reglamentoBox").hidden = !reg;
    if (reg) {
      $("reglamentoTitulo").textContent = "Reglamento: " + reg.titulo;
      $("reglamentoLista").innerHTML = window.listaReglamento(s.id);
    }
    $("stepConfirm").scrollIntoView({ behavior: "smooth" });
  }

  // La duración va de 1 hora hasta el cierre o la siguiente reserva.
  function actualizarDuraciones() {
    if (state.servicio.porDia) $("duracion").value = "1";
    else {
      const sel = $("duracion");
      const previa = parseInt(sel.value, 10) || 1;
      sel.innerHTML = "";
      for (let h = 1; h <= state.maxDur; h++) {
        const opt = document.createElement("option");
        opt.value = h;
        opt.textContent = h === 1 ? "1 hora" : `${h} horas`;
        sel.appendChild(opt);
      }
      sel.value = String(Math.min(previa, state.maxDur));
    }
    pintarResumen();
  }

  function pintarResumen() {
    const s = state.servicio;
    const horaNum = parseInt(state.hora, 10);
    const dur = s.porDia ? 23 - horaNum : parseInt($("duracion").value, 10);
    const fin = horaNum + dur;
    let total = "SE COTIZARÁ";
    if (s.porDia) total = "$9,000 MXN";
    else if (s.precio) total = `$${(s.precio * dur).toLocaleString()} MXN`;
    // Precio fijo: TOTAL; "desde" o por cotizar: TOTAL ESTIMADO
    const precioFijo = s.precio && !/^Desde/i.test(s.precioLabel);
    const etiquetaTotal = precioFijo ? "TOTAL" : "TOTAL ESTIMADO";

    $("confirmSummary").innerHTML = `
      <div class="summary-row"><span>SERVICIO</span><strong>${s.nombre}</strong></div>
      <div class="summary-row"><span>FECHA</span><strong>${fechaLarga(state.fecha)}</strong></div>
      <div class="summary-row"><span>HORARIO</span><strong>${s.porDia ? "Día completo (11:00 – 23:00)" : `${state.hora} – ${String(fin).padStart(2, "0")}:00`}</strong></div>
      <div class="summary-row"><span>${etiquetaTotal}</span><strong>${total}</strong></div>`;

    const msg = $("confirmMsg");
    if (fin > 23) {
      msg.style.color = "var(--error)";
      msg.textContent =
        "La duración excede el cierre (23:00). Reduce horas o elige otra hora.";
    } else {
      msg.textContent = "";
      msg.style.color = "var(--text-secondary)";
    }
  }
  $("duracion").addEventListener("change", pintarResumen);

  $("btnConfirmar").addEventListener("click", () => {
    const s = state.servicio;
    if (!state.hora) return;
    const horaNum = parseInt(state.hora, 10);
    const dur = s.porDia ? 23 - horaNum : parseInt($("duracion").value, 10);
    if (horaNum + dur > 23) return;

    const contacto = {
      nombre: $("resNombre").value.trim(),
      email: $("resEmail").value.trim(),
      telefono: $("resTel").value.trim(),
    };
    const msg = $("confirmMsg");
    const faltante = !contacto.nombre
      ? "Escribe tu nombre."
      : !contacto.email
        ? "Escribe tu correo."
        : !contacto.telefono
          ? "Escribe tu teléfono."
          : !$("reglamentoBox").hidden && !$("aceptoReglamento").checked
            ? "Acepta el reglamento para continuar."
            : "";
    if (faltante) {
      msg.style.color = "var(--error)";
      msg.textContent = faltante;
      return;
    }
    const btn = $("btnConfirmar");
    btn.disabled = true;

    fetch("/api/reservar", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servicio: s.id,
        fecha: state.fecha,
        hora: state.hora,
        duracion: dur,
        mensaje: $("mensaje").value.trim(),
        ...contacto,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        btn.disabled = false;
        if (data.ok) {
          try {
            localStorage.setItem(CONTACTO_KEY, JSON.stringify(contacto));
          } catch {}
          msg.style.color = "var(--text-primary)";
          msg.textContent =
            "✔ " +
            data.mensaje +
            (data.correo ? " Te enviamos los detalles a tu correo. " : " ");
          const link = document.createElement("a");
          link.href = data.enlace;
          link.textContent = "Ver o cancelar mi reserva →";
          link.style.color = "var(--text-primary)";
          msg.appendChild(link);
          $("mensaje").value = "";
          state.hora = null;
          cargarSlots();
        } else {
          msg.style.color = "var(--error)";
          msg.textContent = data.error;
        }
      })
      .catch(() => {
        btn.disabled = false;
        $("confirmMsg").style.color = "var(--error)";
        $("confirmMsg").textContent = "No se pudo conectar con el servidor.";
      });
  });
});
