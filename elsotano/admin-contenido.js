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
  // Textos de la página de inicio, en el orden en que aparecen.
  // [clave, etiqueta, límite de letras, tipo]; "lista" = un punto por renglón.
  const TEXTOS = [
    ["INICIO", [
      ["inicio.titulo", "Título", 60],
      ["inicio.resaltado", "Palabra resaltada del título", 30],
      ["inicio.texto", "Texto bajo el título", 400, "area"],
    ]],
    ["SOBRE NOSOTROS", [["nosotros.texto", "Texto", 600, "area"]]],
    ...[
      ["sala", "SALA DE ENSAYO"],
      ["fotografia", "ESTUDIO FOTOGRÁFICO"],
      ["grabacion", "ESTUDIO DE GRABACIÓN"],
      ["cotiza", "COTIZA TU PROYECTO"],
    ].map(([id, titulo]) => [`SERVICIOS · ${titulo}`, [
      [`servicio.${id}.titulo`, "Nombre en la tarjeta", 50],
      [`servicio.${id}.puntos`, "Puntos de la tarjeta (uno por renglón)", 140, "lista"],
    ]]),
    ["RENTA DE EQUIPO", [
      ["equipo.intro", "Frase bajo el título", 300, "area"],
      ["equipo.nota", "Nota bajo la lista de equipo", 300, "area"],
    ]],
    ["PIE DE PÁGINA", [["pie.texto", "Texto bajo el logo", 300, "area"]]],
  ];
  const idTexto = (clave) => "t-" + clave.replace(/\./g, "-");
  $("listaTextos").innerHTML = TEXTOS.map(
    ([titulo, campos]) => `
    <div class="admin-form">
      <h3>${titulo}</h3>
      ${campos
        .map(([clave, etiqueta, max, tipo]) => {
          const id = idTexto(clave);
          const campo = tipo
            ? `<textarea id="${id}" rows="${tipo === "lista" ? 5 : 3}" ${tipo === "lista" ? "" : `maxlength="${max}"`}></textarea>`
            : `<input type="text" id="${id}" maxlength="${max}" />`;
          return `<div class="form-group contenido-texto"><label for="${id}">${etiqueta}</label>${campo}</div>`;
        })
        .join("")}
    </div>`,
  ).join("");
  const CAMPOS = TEXTOS.flatMap(([, campos]) => campos);

  // Fotos: [clave, nombre, foto original (null = recuadro vacío)]
  const FOTOS = [
    ["servicio.sala", "Sala de Ensayo", "IMG/5-600.webp"],
    ["servicio.fotografia", "Estudio Fotográfico", "IMG/fotografia-sombrilla-600.webp"],
    ["servicio.grabacion", "Estudio de Grabación", "IMG/estudio-grabacion-600.webp"],
    ["servicio.cotiza", "Cotiza tu proyecto", "IMG/cotiza-proyecto.webp"],
    ["equipo.principal", "Renta de equipo · foto grande", "IMG/equipo-principal.webp"],
    ["equipo.1", "Renta de equipo · foto 1", null],
    ["equipo.2", "Renta de equipo · foto 2", null],
    ["equipo.3", "Renta de equipo · foto 3", null],
    ["equipo.4", "Renta de equipo · foto 4", null],
  ];
  const idFoto = (clave) => "f-" + clave.replace(/\./g, "-");
  $("listaFotos").innerHTML = FOTOS.map(
    ([clave, nombre]) => `
    <div class="contenido-foto" id="${idFoto(clave)}">
      <div class="contenido-foto-img"></div>
      <strong>${nombre}</strong>
      <label class="btn btn-full contenido-subir">
        CAMBIAR FOTO
        <input type="file" accept="image/*" data-foto="${clave}" hidden />
      </label>
      <button class="admin-link contenido-quitar" data-quitar="${clave}" hidden>Volver a la original</button>
      <p class="contenido-foto-msg" role="status"></p>
    </div>`,
  ).join("");

  function pintarFotos(fotos) {
    FOTOS.forEach(([clave, nombre, original]) => {
      const caja = $(idFoto(clave));
      const subida = fotos?.[clave];
      const src = subida ? subida.chica : original;
      caja.querySelector(".contenido-foto-img").innerHTML = src
        ? `<img src="${src}" alt="${nombre}" loading="lazy" />`
        : "<span>SIN FOTO</span>";
      caja.querySelector(".contenido-quitar").hidden = !subida;
      caja.querySelector(".contenido-quitar").textContent = original ? "Volver a la original" : "Quitar foto";
    });
  }

  function avisoFoto(clave, texto, error) {
    const p = $(idFoto(clave)).querySelector(".contenido-foto-msg");
    p.textContent = texto;
    p.classList.toggle("es-error", Boolean(error));
  }

  document.querySelectorAll("[data-foto]").forEach((input) =>
    input.addEventListener("change", () => {
      const clave = input.dataset.foto;
      const archivo = input.files[0];
      input.value = "";
      if (!archivo) return;
      if (archivo.size > 12 * 1024 * 1024) {
        avisoFoto(clave, "La foto pesa más de 12 MB. Elige otra.", true);
        return;
      }
      const caja = $(idFoto(clave));
      caja.classList.add("subiendo");
      avisoFoto(clave, "Subiendo…");
      fetch(`/api/contenido/foto?lugar=${encodeURIComponent(clave)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/octet-stream" },
        body: archivo,
      })
        .then((r) => r.json().catch(() => ({ ok: false })))
        .then((d) => {
          if (!d.ok) return avisoFoto(clave, d.error || "No se pudo subir la foto.", true);
          pintarFotos(d.contenido.fotos);
          avisoFoto(clave, "✓ Foto guardada. Ya se ve en la página.");
        })
        .catch(() => avisoFoto(clave, "No se pudo conectar con el servidor.", true))
        .finally(() => caja.classList.remove("subiendo"));
    }),
  );

  document.querySelectorAll("[data-quitar]").forEach((b) =>
    b.addEventListener("click", () => {
      const clave = b.dataset.quitar;
      b.disabled = true;
      fetch("/api/contenido", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotos: { [clave]: null } }),
      })
        .then((r) => r.json().catch(() => ({ ok: false })))
        .then((d) => {
          if (!d.ok) return avisoFoto(clave, d.error || "No se pudo quitar la foto.", true);
          pintarFotos(d.contenido.fotos);
          avisoFoto(clave, "✓ Listo.");
        })
        .catch(() => avisoFoto(clave, "No se pudo conectar con el servidor.", true))
        .finally(() => (b.disabled = false));
    }),
  );

  // Pestañas
  document.querySelectorAll("[data-pestana]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-pestana]").forEach((o) => {
        const activo = o === b;
        o.classList.toggle("activo", activo);
        o.setAttribute("aria-pressed", String(activo));
      });
      $("pestanaPrecios").hidden = b.dataset.pestana !== "precios";
      $("pestanaTextos").hidden = b.dataset.pestana !== "textos";
      $("pestanaFotos").hidden = b.dataset.pestana !== "fotos";
      // Las fotos se guardan solas: ahí no hace falta el botón de guardar.
      $("zonaGuardar").hidden = b.dataset.pestana === "fotos";
    }),
  );

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
    CAMPOS.forEach(([clave, , , tipo]) => {
      const v = c.textos?.[clave];
      $(idTexto(clave)).value = tipo === "lista" ? (v || []).join("\n") : v ?? "";
    });
    pintarFotos(c.fotos);
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
    c.textos = Object.fromEntries(
      CAMPOS.map(([clave, , , tipo]) => {
        const v = $(idTexto(clave)).value;
        return [clave, tipo === "lista" ? v.split("\n").map((x) => x.trim()).filter(Boolean) : v.trim()];
      }),
    );
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
    for (const [clave, etiqueta, max, tipo] of CAMPOS) {
      if (tipo !== "lista") continue;
      const puntos = c.textos[clave];
      if (puntos.length > 10) return `${etiqueta}: máximo 10 puntos.`;
      if (puntos.some((p) => p.length > max)) return `${etiqueta}: cada punto puede tener hasta ${max} letras.`;
    }
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
