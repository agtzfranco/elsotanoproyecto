document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const SERVICIOS = [
    { id: "sala-ensayo", nombre: "Sala de Ensayo", unidad: "hora" },
    { id: "fotografia", nombre: "Renta de Estudio Fotográfico", unidad: "hora" },
    { id: "equipo", nombre: "Renta de Equipo", unidad: "día", nota: "Se renta por día completo: el horario es el que se aparta." },
  ];
  // 11 -> "11:00 a.m.", 23 -> "11:00 p.m."; 0 y 24 son medianoche.
  const etiquetaHora = (h) => {
    if (h % 24 === 0) return "Medianoche";
    if (h === 12) return "Mediodía";
    return `${h % 12}:00 ${h < 12 ? "a.m." : "p.m."}`;
  };
  // Abre de 0 a 23; cierra de 1 a 24.
  function llenarHoras(sel, desde, hasta) {
    for (let h = desde; h <= hasta; h++) sel.add(new Option(etiquetaHora(h), h));
  }

  // Una tarjeta por servicio: precio y horario.
  $("listaServicios").innerHTML = SERVICIOS.map(
    (s) => `
    <div class="admin-form" data-servicio="${s.id}">
      <h3>${s.nombre.toUpperCase()}</h3>
      ${s.nota ? `<p class="admin-nota">${s.nota}</p>` : ""}
      <div class="form-row contenido-fila">
        <div class="form-group">
          <label for="precio-${s.id}">Precio (MXN / ${s.unidad})</label>
          <div class="contenido-precio">
            <span aria-hidden="true">$</span>
            <input type="number" id="precio-${s.id}" class="c-precio" min="0" max="1000000" step="1" inputmode="numeric" />
          </div>
        </div>
        <div class="form-group">
          <label for="abre-${s.id}">Abre</label>
          <select id="abre-${s.id}" class="c-abre"></select>
        </div>
        <div class="form-group">
          <label for="cierra-${s.id}">Cierra</label>
          <select id="cierra-${s.id}" class="c-cierra"></select>
        </div>
      </div>
    </div>`,
  ).join("");
  document.querySelectorAll(".c-abre, #atAbre").forEach((sel) => llenarHoras(sel, 0, 23));
  document.querySelectorAll(".c-cierra, #atCierra").forEach((sel) => llenarHoras(sel, 1, 24));

  const msg = $("guardarMsg");
  const boton = $("btnGuardar");

  function pintar(c) {
    SERVICIOS.forEach((s) => {
      $(`precio-${s.id}`).value = c.precios?.[s.id] ?? "";
      $(`abre-${s.id}`).value = String(c.horarios?.[s.id]?.apertura ?? 11);
      $(`cierra-${s.id}`).value = String(c.horarios?.[s.id]?.cierre ?? 23);
    });
    $("atDias").value = c.atencion?.dias ?? "";
    $("atAbre").value = String(c.atencion?.apertura ?? 11);
    $("atCierra").value = String(c.atencion?.cierre ?? 23);
  }

  function leer() {
    const c = { precios: {}, horarios: {}, atencion: {} };
    SERVICIOS.forEach((s) => {
      c.precios[s.id] = $(`precio-${s.id}`).value.trim();
      c.horarios[s.id] = {
        apertura: Number($(`abre-${s.id}`).value),
        cierre: Number($(`cierra-${s.id}`).value),
      };
    });
    c.atencion = {
      dias: $("atDias").value.trim(),
      apertura: Number($("atAbre").value),
      cierre: Number($("atCierra").value),
    };
    return c;
  }

  // Revisa en el navegador lo mismo que revisa el servidor, para avisar antes.
  function revisar(c) {
    for (const s of SERVICIOS) {
      const p = c.precios[s.id];
      if (!/^\d+$/.test(p)) return `Escribe el precio de ${s.nombre} (solo números).`;
      if (c.horarios[s.id].cierre <= c.horarios[s.id].apertura)
        return `${s.nombre}: la hora de cierre debe ser después de la de apertura.`;
    }
    if (!c.atencion.dias) return "Escribe los días del horario de atención.";
    if (c.atencion.cierre <= c.atencion.apertura)
      return "Horario de atención: la hora de cierre debe ser después de la de apertura.";
    return "";
  }

  fetch("/api/contenido", { credentials: "include" })
    .then((r) => r.json())
    .then((c) => {
      pintar(c);
      boton.disabled = false;
    })
    .catch(() => (msg.textContent = "No se pudo conectar con el servidor. Recarga la página."));

  // Al tocar cualquier campo se borra el aviso anterior.
  document.querySelector(".contenido-editor").addEventListener("input", () => {
    msg.textContent = "";
    msg.classList.remove("es-error");
  });

  boton.addEventListener("click", () => {
    const c = leer();
    const problema = revisar(c);
    if (problema) {
      msg.textContent = problema;
      msg.classList.add("es-error");
      return;
    }
    boton.disabled = true;
    msg.classList.remove("es-error");
    msg.textContent = "Guardando…";
    fetch("/api/contenido", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    })
      .then((r) => r.json().catch(() => ({ ok: false })))
      .then((d) => {
        if (!d.ok) {
          msg.textContent = d.error || "No se pudo guardar.";
          msg.classList.add("es-error");
          return;
        }
        pintar(d.contenido);
        msg.textContent = "✓ Guardado. Ya se ve en la página.";
      })
      .catch(() => {
        msg.textContent = "No se pudo conectar con el servidor.";
        msg.classList.add("es-error");
      })
      .finally(() => (boton.disabled = false));
  });
});
