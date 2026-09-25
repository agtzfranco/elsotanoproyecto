document.addEventListener("DOMContentLoaded", () => {
  const SERVICIOS = [
    {
      id: "sala-ensayo",
      nombre: "Sala de Ensayo",
      img: "IMG/6.jpg",
      precio: 250,
      precioLabel: "$250 <span>MXN / hora</span>",
      desc: "Monitoreo personal con mezcla individual y grabación multipista.",
    },
    {
      id: "grabacion",
      nombre: "Estudio de Grabación",
      img: "IMG/5.jpg",
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
      precio: null,
      precioLabel: "Cotizar <span>por sesión</span>",
      desc: "Fondos intercambiables e iluminación profesional.",
    },
    {
      id: "equipo",
      nombre: "Renta de Equipo",
      img: "IMG/3.jpg",
      precio: 9000,
      porEvento: true,
      precioLabel: "$9,000 <span>MXN / evento</span>",
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

  let state = { servicio: null, fecha: null, hora: null };
  let usuario = null;
  let calOffset = 0;

  fetch("api/usuario.php")
    .then((r) => r.json())
    .then((d) => (usuario = d.usuario));

  const $ = (id) => document.getElementById(id);
  const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

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
    window.scrollTo(0, 0); // la página abre arriba: título + calendario
  }

  btnCambiar.addEventListener("click", mostrarPaso1);

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

  function cargarSlots() {
    const grid = $("slots-grid");
    grid.innerHTML = "";
    $("disp-estado").textContent = "Cargando horarios...";
    fetch(
      `api/disponibilidad.php?servicio=${encodeURIComponent(state.servicio.id)}&fecha=${state.fecha}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          $("disp-estado").textContent = "Error: " + data.error;
          return;
        }
        const libres = data.slots.filter((s) => !s.ocupado).length;
        $("disp-estado").textContent = libres
          ? `${libres} horario(s) libre(s) — ${fechaLarga(state.fecha)}`
          : `Sin horarios libres el ${fechaLarga(state.fecha)}.`;
        data.slots.forEach((slot) => {
          const b = document.createElement("button");
          b.className = "slot " + (slot.ocupado ? "ocupado" : "libre");
          b.textContent = slot.hora;
          b.disabled = slot.ocupado;
          if (!slot.ocupado)
            b.addEventListener("click", () => {
              state.hora = slot.hora;
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

  /* ---------- PASO 3: confirmación ---------- */
  function mostrarConfirmacion() {
    const s = state.servicio;
    $("duracionGroup").style.display = s.porEvento ? "none" : "block";
    if (s.porEvento) $("duracion").value = "1";
    pintarResumen();
    $("stepConfirm").hidden = false;
    $("confirmMsg").textContent = "";
    $("stepConfirm").scrollIntoView({ behavior: "smooth" });
  }

  function pintarResumen() {
    const s = state.servicio;
    const dur = s.porEvento ? 1 : parseInt($("duracion").value, 10);
    const horaNum = parseInt(state.hora, 10);
    const fin = horaNum + dur;
    let total = "SE COTIZARÁ";
    if (s.porEvento) total = "$9,000 MXN";
    else if (s.precio) total = `$${(s.precio * dur).toLocaleString()} MXN`;

    $("confirmSummary").innerHTML = `
      <div class="summary-row"><span>SERVICIO</span><strong>${s.nombre}</strong></div>
      <div class="summary-row"><span>FECHA</span><strong>${fechaLarga(state.fecha)}</strong></div>
      <div class="summary-row"><span>HORARIO</span><strong>${state.hora} – ${String(fin).padStart(2, "0")}:00</strong></div>
      <div class="summary-row"><span>TOTAL ESTIMADO</span><strong>${total}</strong></div>`;

    const msg = $("confirmMsg");
    if (fin > 23) {
      msg.style.color = "var(--error)";
      msg.textContent =
        "La duración excede el cierre (23:00). Reduce horas o elige otra hora.";
    } else {
      msg.textContent = usuario ? "" : "⚠ Debes iniciar sesión para confirmar.";
      msg.style.color = "var(--text-secondary)";
    }
  }
  $("duracion").addEventListener("change", pintarResumen);

  $("btnConfirmar").addEventListener("click", () => {
    const s = state.servicio;
    const dur = s.porEvento ? 1 : parseInt($("duracion").value, 10);
    if (parseInt(state.hora, 10) + dur > 23) return;

    if (!usuario) {
      window.location.href =
        "login.html?next=" + encodeURIComponent("reservas.html");
      return;
    }

    fetch("api/reservar.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servicio: s.id,
        fecha: state.fecha,
        hora: state.hora,
        duracion: dur,
        mensaje: $("mensaje").value.trim(),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const msg = $("confirmMsg");
        if (data.login) {
          window.location.href =
            "login.html?next=" + encodeURIComponent("reservas.html");
          return;
        }
        if (data.ok) {
          msg.style.color = "var(--text-primary)";
          msg.textContent = "✔ " + data.mensaje + " (Revísala en MIS RESERVAS)";
          $("mensaje").value = "";
          cargarSlots();
        } else {
          msg.style.color = "var(--error)";
          msg.textContent = data.error;
        }
      })
      .catch(() => {
        $("confirmMsg").style.color = "var(--error)";
        $("confirmMsg").textContent = "No se pudo conectar con el servidor.";
      });
  });
});
