// Reglas del negocio compartidas por las rutas de reservas.

export const HORA_APERTURA = 11;
export const HORA_CIERRE = 23;
// Lo que dure la jornada: el límite real es la hora de cierre.
export const DURACION_MAXIMA = 12;
export const DIAS_MAXIMOS_ANTICIPACION = 365;

export const SERVICIOS = {
  "sala-ensayo": { nombre: "Sala de Ensayo" },
  grabacion: { nombre: "Estudio de Grabación" },
  podcast: { nombre: "Producción de Podcast" },
  fotografia: { nombre: "Sesiones de Fotografía" },
  // La renta de equipo es por día: ocupa el día completo, de la apertura al cierre.
  equipo: { nombre: "Renta de Equipo", porDia: true },
};

export const NOMBRES_SERVICIO = {
  ...Object.fromEntries(Object.entries(SERVICIOS).map(([id, s]) => [id, s.nombre])),
  bloqueo: "Bloqueo de staff",
};

const ZONA_HORARIA = process.env.ZONA_HORARIA || "America/Mexico_City";

// Fecha (YYYY-MM-DD) y hora actuales en la zona horaria del estudio,
// sin depender de la zona horaria del servidor (Render corre en UTC).
export function ahoraLocal() {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA_HORARIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: parseInt(partes.hour, 10),
  };
}

export function esFechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

export function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Entero estricto: "12", "12:00" y 12 son válidos; "abc", "1.5" o "" no.
export function parseHora(valor) {
  const m = /^(\d{1,2})(?::00(?::00)?)?$/.exec(String(valor ?? "").trim());
  return m ? parseInt(m[1], 10) : NaN;
}

export function parseEntero(valor) {
  const s = String(valor ?? "").trim();
  return /^\d+$/.test(s) ? parseInt(s, 10) : NaN;
}

export const horaSql = (h) => `${String(h).padStart(2, "0")}:00:00`;
