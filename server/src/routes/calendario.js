import { Router } from "express";
import { SERVICIOS, esFechaValida } from "../lib/reglas.js";

const router = Router();

const LUGAR = "Av. La Luz 6944, Pedregal de la Silla, Monterrey, N.L.";

// Monterrey está en UTC-6 todo el año (sin horario de verano desde 2022).
function fechaUTC(fecha, hora) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora + 6))
    .toISOString()
    .replace(/[-:]|\.\d{3}/g, "");
}

// Archivo .ics para que el cliente agregue su reserva al calendario
// (iPhone, Outlook). No toca la base de datos: solo arma el evento.
router.get("/", (req, res) => {
  const servicio = SERVICIOS[String(req.query.servicio ?? "")];
  const fecha = String(req.query.fecha ?? "");
  const hora = parseInt(req.query.hora, 10);
  const dur = parseInt(req.query.dur, 10);

  if (
    !servicio ||
    !esFechaValida(fecha) ||
    !(hora >= 0 && hora < 24) ||
    !(dur >= 1 && hora + dur <= 24)
  ) {
    return res.status(400).send("Datos no válidos");
  }

  const inicio = fechaUTC(fecha, hora);
  const titulo = `${servicio.nombre} · El Sótano`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//El Sotano//Reservas//ES",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${inicio}-${req.query.servicio}@elsotano`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, "")}`,
    `DTSTART:${inicio}`,
    `DTEND:${fechaUTC(fecha, hora + dur)}`,
    `SUMMARY:${titulo}`,
    `LOCATION:${LUGAR.replace(/,/g, "\\,")}`,
    "DESCRIPTION:Reserva en El Sótano. Dudas: instagram.com/elsotanomx",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${titulo}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="reserva-el-sotano.ics"',
  );
  res.send(ics);
});

export default router;
