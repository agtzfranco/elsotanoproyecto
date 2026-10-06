// Validación y alta de una reserva, compartida por la página pública
// (/api/reservar) y por la reserva manual del panel de staff (/api/admin).
import { supabase } from "../supabaseClient.js";
import { nuevoToken } from "./tokens.js";
import {
  SERVICIOS,
  HORA_APERTURA,
  HORA_CIERRE,
  DURACION_MAXIMA,
  DIAS_MAXIMOS_ANTICIPACION,
  ahoraLocal,
  esFechaValida,
  sumarDias,
  parseHora,
  parseEntero,
  horaSql,
} from "./reglas.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ERROR_OCUPADO = "Ese horario ya fue reservado o está bloqueado. Elige otro.";

// Con staff: true el correo y el teléfono son opcionales (alguien que llega
// en persona o escribe por DM) y se puede registrar la hora en curso de hoy.
// Devuelve { ok: true, id, token, fila } o { ok: false, error, status? }.
export async function crearReserva(body, { staff = false } = {}) {
  const { servicio, fecha, hora } = body ?? {};
  for (const [campo, valor] of Object.entries({ servicio, fecha, hora })) {
    if (!valor) return { ok: false, error: `Falta el campo: ${campo}` };
  }

  const infoServicio = SERVICIOS[String(servicio)];
  if (!infoServicio) return { ok: false, error: "Servicio no válido." };

  const ahora = ahoraLocal();
  if (!esFechaValida(String(fecha))) return { ok: false, error: "Fecha no válida." };
  if (fecha < ahora.fecha) return { ok: false, error: "Esa fecha ya pasó." };
  if (fecha > sumarDias(ahora.fecha, DIAS_MAXIMOS_ANTICIPACION)) {
    return { ok: false, error: "Solo se puede reservar con hasta un año de anticipación." };
  }

  // La renta de equipo es por día: siempre ocupa de la apertura al cierre.
  const horaNum = infoServicio.porDia ? HORA_APERTURA : parseHora(hora);
  if (!Number.isInteger(horaNum) || horaNum < HORA_APERTURA || horaNum >= HORA_CIERRE) {
    return { ok: false, error: "El horario debe estar entre 11:00 y 23:00." };
  }
  if (!staff && fecha === ahora.fecha && horaNum <= ahora.hora) {
    return {
      ok: false,
      error: infoServicio.porDia
        ? "La renta de equipo de hoy ya no está disponible. Elige otro día."
        : "Esa hora ya pasó. Elige una más tarde.",
    };
  }

  const duracion = infoServicio.porDia
    ? HORA_CIERRE - HORA_APERTURA
    : parseEntero(body?.duracion ?? 1);
  if (!Number.isInteger(duracion) || duracion < 1 || (!infoServicio.porDia && duracion > DURACION_MAXIMA)) {
    return { ok: false, error: `La duración debe ser de 1 a ${DURACION_MAXIMA} horas.` };
  }
  const horaFinNum = horaNum + duracion;
  if (horaFinNum > HORA_CIERRE) {
    return { ok: false, error: "El horario debe estar entre 11:00 y 23:00." };
  }

  const nombre = String(body?.nombre ?? "").trim().slice(0, 100);
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 150);
  const telefono = String(body?.telefono ?? "").trim().slice(0, 30);
  if (nombre.length < 3) {
    return { ok: false, error: staff ? "Escribe el nombre del cliente." : "Escribe tu nombre completo." };
  }
  if ((!staff || email) && !EMAIL_RE.test(email)) {
    return { ok: false, error: "Correo electrónico no válido." };
  }
  if ((!staff || telefono) && telefono.replace(/\D/g, "").length < 8) {
    return { ok: false, error: "Escribe un teléfono válido (mínimo 8 dígitos)." };
  }

  const { token, hash } = nuevoToken();
  const fila = {
    usuario_id: null,
    servicio: String(servicio),
    fecha,
    hora_inicio: horaSql(horaNum),
    hora_fin: horaSql(horaFinNum),
    duracion_horas: duracion,
    nombre,
    telefono,
    email,
    mensaje: String(body?.mensaje ?? "").trim().slice(0, 1000),
    token_hash: hash,
  };

  const { data: id, error } = await supabase.rpc("reservar_si_libre", {
    p_usuario_id: fila.usuario_id,
    p_servicio: fila.servicio,
    p_fecha: fila.fecha,
    p_hora_inicio: fila.hora_inicio,
    p_hora_fin: fila.hora_fin,
    p_duracion: fila.duracion_horas,
    p_nombre: fila.nombre,
    p_telefono: fila.telefono,
    p_email: fila.email,
    p_mensaje: fila.mensaje,
    p_token_hash: fila.token_hash,
  });
  if (error) {
    // PGRST202 = falta correr supabase/migrations/002_reservas_seguras.sql
    console.error("Error al reservar:", error.code, error.message);
    return { ok: false, status: 500, error: "No se pudo registrar la reserva." };
  }
  if (!id) return { ok: false, error: ERROR_OCUPADO };

  // Las reservas quedan confirmadas al momento: el horario ya se validó y la
  // función de la base no deja que dos personas tomen el mismo espacio.
  const { error: errorConfirmar } = await supabase
    .from("reservaciones")
    .update({ estado: "confirmada" })
    .eq("id", id);
  if (errorConfirmar) {
    console.error("No se pudo marcar la reserva como confirmada:", errorConfirmar.message);
  }

  return { ok: true, id, token, fila };
}
