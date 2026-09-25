document.addEventListener("DOMContentLoaded", () => {
  const SERVICIOS = [
    { id: "sala-ensayo", corto: "SALA" },
    { id: "grabacion", corto: "ESTUDIO" },
    { id: "podcast", corto: "PODCAST" },
    { id: "fotografia", corto: "FOTO" },
    { id: "equipo", corto: "EQUIPO" },
  ];
  const $ = (id) => document.getElementById(id);
  const input = $("dispFecha");
  const board = $("board");

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fechaCorta = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  };

  let fecha = toISO(hoy);
  input.value = fecha;
  input.min = toISO(hoy);

  function moverDia(delta) {
    const [y, m, d] = fecha.split("-").map(Number);
    const dt = new Date(y, m - 1, d + delta);
    if (dt < hoy) return;
    fecha = toISO(dt);
    input.value = fecha;
    cargar();
  }
  $("dayPrev").addEventListener("click", () => moverDia(-1));
  $("dayNext").addEventListener("click", () => moverDia(1));
  input.addEventListener("change", () => {
    if (input.value) {
      fecha = input.value;
      cargar();
    }
  });

  function cargar() {
    $("dispFechaLarga").textContent = `Pizarra del ${fechaCorta(fecha)}`;
    board.innerHTML = `<p class="disp-estado">Cargando pizarra...</p>`;

    Promise.all(
      SERVICIOS.map((s) =>
        fetch(`api/disponibilidad.php?servicio=${s.id}&fecha=${fecha}`).then(
          (r) => r.json(),
        ),
      ),
    )
      .then((results) => {
        let html =
          `<div class="board-head"><span class="board-cell head">HORA</span>` +
          SERVICIOS.map(
            (s) => `<span class="board-cell head">${s.corto}</span>`,
          ).join("") +
          `</div>`;

        for (let h = 11; h < 23; h++) {
          const hora = `${String(h).padStart(2, "0")}:00`;
          html += `<div class="board-row"><span class="board-cell hora">${hora}</span>`;
          results.forEach((data) => {
            const slot = (data.slots || []).find((x) => x.hora === hora);
            html += `<span class="board-cell ${slot && slot.ocupado ? "ocupado" : "libre"}"></span>`;
          });
          html += `</div>`;
        }
        board.innerHTML = html;
      })
      .catch(() => {
        board.innerHTML = `<p class="disp-estado">No se pudo conectar con el servidor.</p>`;
      });
  }
  cargar();
});
