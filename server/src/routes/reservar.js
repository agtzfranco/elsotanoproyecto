import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { crearLimite } from "../lib/limite.js";
import { nuevoToken, urlSitio } from "../lib/tokens.js";
import { avisos, correoConfigurado } from "../lib/correo.js";
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
} from "../lib/reglas.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ERROR_OCUPADO = "Ese horario ya fue reservado o está bloqueado. Elige otro.";

// Máximo 5 reservas por hora desde la misma conexión.
const limite = crearLimite({ maximo: 5, ventanaMs: 60 * 60 * 1000 });

router.post("/", async (req, res) => {
  if (limite.excedido(req)) {
    return res.status(429).json({
      ok: false,
      error: "Hiciste demasiadas reservas seguidas. Intenta más tarde o contáctanos.",
    });
  }

  const { servicio, fecha, hora } = req.body ?? {};
  for (const [campo, valor] of Object.entries({ servicio, fecha, hora })) {
    if (!valor) {
      return res.json({ ok: false, error: `Falta el campo: ${campo}` });
    }
  }

  const infoServicio = SERVICIOS[String(servicio)];
  if (!infoServicio) {
    return res.json({ ok: false, error: "Servicio no válido." });
  }

  const ahora = ahoraLocal();
  if (!esFechaValida(String(fecha))) {
    return res.json({ ok: false, error: "Fecha no válida." });
  }
  if (fecha < ahora.fecha) {
    return res.json({ ok: false, error: "Esa fecha ya pasó." });
  }
  if (fecha > sumarDias(ahora.fecha, DIAS_MAXIMOS_ANTICIPACION)) {
    return res.json({ ok: false, error: "Solo se puede reservar con hasta un año de anticipación." });
  }

  // La renta de equipo es por día: siempre ocupa de la apertura al cierre.
  const horaNum = infoServicio.porDia ? HORA_APERTURA : parseHora(hora);
  if (!Number.isInteger(horaNum) || horaNum < HORA_APERTURA || horaNum >= HORA_CIERRE) {
    return res.json({ ok: false, error: "El horario debe estar entre 11:00 y 23:00." });
  }
  if (fecha === ahora.fecha && horaNum <= ahora.hora) {
    return res.json({
      ok: false,
      error: infoServicio.porDia
        ? "La renta de equipo de hoy ya no está disponible. Elige otro día."
        : "Esa hora ya pasó. Elige una más tarde.",
    });
  }

  const duracion = infoServicio.porDia
    ? HORA_CIERRE - HORA_APERTURA
    : parseEntero(req.body?.duracion ?? 1);
  if (!Number.isInteger(duracion) || duracion < 1 || (!infoServicio.porDia && duracion > DURACION_MAXIMA)) {
    return res.json({ ok: false, error: `La duración debe ser de 1 a ${DURACION_MAXIMA} horas.` });
  }
  const horaFinNum = horaNum + duracion;
  if (horaFinNum > HORA_CIERRE) {
    return res.json({ ok: false, error: "El horario debe estar entre 11:00 y 23:00." });
  }

  const nombre = String(req.body?.nombre ?? "").trim().slice(0, 100);
  const email = String(req.body?.email ?? "").trim().toLowerCase().slice(0, 150);
  const telefono = String(req.body?.telefono ?? "").trim().slice(0, 30);
  if (nombre.length < 3) {
    return res.json({ ok: false, error: "Escribe tu nombre completo." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.json({ ok: false, error: "Correo electrónico no válido." });
  }
  if (telefono.replace(/\D/g, "").length < 8) {
    return res.json({ ok: false, error: "Escribe un teléfono válido (mínimo 8 dígitos)." });
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
    mensaje: String(req.body?.mensaje ?? "").trim().slice(0, 1000),
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
    return res.status(500).json({ ok: false, error: "No se pudo registrar la reserva." });
  }
  if (!id) {
    return res.json({ ok: false, error: ERROR_OCUPADO });
  }

  // Las reservas quedan confirmadas al momento: el horario ya se validó y la
  // función de la base no deja que dos personas tomen el mismo espacio.
  const { error: errorConfirmar } = await supabase
    .from("reservaciones")
    .update({ estado: "confirmada" })
    .eq("id", id);
  if (errorConfirmar) {
    console.error("No se pudo marcar la reserva como confirmada:", errorConfirmar.message);
  }

  limite.registrar(req);
  const enlace = `${urlSitio(req)}/mis-reservas/${token}`;
  avisos.reservaNueva(fila, enlace);
  res.json({
    ok: true,
    mensaje: "¡Reserva confirmada! Te esperamos.",
    enlace,
    correo: correoConfigurado(),
  });
});

export default router;
