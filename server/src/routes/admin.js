import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { requireAdmin } from "../middleware/auth.js";
import { avisos, correoConfigurado } from "../lib/correo.js";
import { urlSitio } from "../lib/tokens.js";
import { crearReserva } from "../lib/reservaNueva.js";
import {
  SERVICIOS,
  HORA_APERTURA,
  HORA_CIERRE,
  ahoraLocal,
  esFechaValida,
  parseHora,
  parseEntero,
  horaSql,
} from "../lib/reglas.js";

const router = Router();
const CAMPOS = "id, servicio, fecha, hora_inicio, hora_fin, duracion_horas, nombre, telefono, email, mensaje, estado";

router.use(requireAdmin);

async function listarReservas(res) {
  const { data, error } = await supabase
    .from("reservaciones")
    .select(CAMPOS)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });
  if (error) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  res.json({ reservas: data ?? [] });
}

router.get("/", async (req, res) => {
  const accion = req.query.accion ?? "";
  if (accion !== "reservas") {
    return res.json({ ok: false, error: "Acción no válida." });
  }
  return listarReservas(res);
});

router.post("/", async (req, res) => {
  const accion = req.body?.accion ?? "";

  if (accion === "reservas") {
    return listarReservas(res);
  }

  if (accion === "confirmar" || accion === "cancelar") {
    const id = parseEntero(req.body?.id);
    if (!Number.isInteger(id)) {
      return res.json({ ok: false, error: "Reserva no válida." });
    }
    const estado = accion === "confirmar" ? "confirmada" : "cancelada";
    let consulta = supabase.from("reservaciones").update({ estado }).eq("id", id);
    // Solo se confirma lo pendiente; no se "revive" una reserva cancelada.
    consulta = accion === "confirmar" ? consulta.eq("estado", "pendiente") : consulta.neq("estado", "cancelada");
    const { data, error } = await consulta.select(CAMPOS);
    if (error) {
      return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
    }
    const r = (data ?? [])[0];
    if (r && r.servicio !== "bloqueo") {
      if (accion === "confirmar") avisos.reservaConfirmada(r);
      else avisos.reservaCanceladaPorStaff(r);
    }
    return res.json({ ok: Boolean(r), error: r ? undefined : "La reserva ya cambió de estado. Recarga la página." });
  }

  // Reserva manual del staff (llegó en persona, escribió por DM...). Usa las
  // mismas reglas que la web y ocupa el horario en el calendario público.
  if (accion === "crear") {
    const r = await crearReserva(req.body, { staff: true });
    if (!r.ok) {
      return res.status(r.status ?? 200).json({ ok: false, error: r.error });
    }
    const enlace = `${urlSitio(req)}/mis-reservas/${r.token}`;
    if (r.fila.email) avisos.reservaManual(r.fila, enlace);
    return res.json({ ok: true, enlace, correo: Boolean(r.fila.email) && correoConfigurado() });
  }

  // Cambiar fecha u hora de una reserva. El cliente conserva su mismo enlace
  // y, si dejó correo, recibe el nuevo horario.
  if (accion === "mover") {
    const id = parseEntero(req.body?.id);
    const fecha = String(req.body?.fecha ?? "");
    if (!Number.isInteger(id)) {
      return res.json({ ok: false, error: "Reserva no válida." });
    }
    const { data: actual, error: errorLeer } = await supabase
      .from("reservaciones")
      .select(CAMPOS)
      .eq("id", id)
      .maybeSingle();
    if (errorLeer) {
      return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
    }
    if (!actual || actual.estado === "cancelada" || actual.servicio === "bloqueo") {
      return res.json({ ok: false, error: "Esa reserva ya no se puede mover. Recarga la página." });
    }
    if (!esFechaValida(fecha)) {
      return res.json({ ok: false, error: "Fecha no válida." });
    }
    if (fecha < ahoraLocal().fecha) {
      return res.json({ ok: false, error: "Esa fecha ya pasó." });
    }
    const porDia = SERVICIOS[actual.servicio]?.porDia;
    const horaNum = porDia ? HORA_APERTURA : parseHora(req.body?.hora);
    const dur = porDia ? HORA_CIERRE - HORA_APERTURA : parseEntero(req.body?.duracion);
    if (!Number.isInteger(horaNum) || !Number.isInteger(dur) || dur < 1 ||
        horaNum < HORA_APERTURA || horaNum + dur > HORA_CIERRE) {
      return res.json({ ok: false, error: "Fuera del horario 11:00–23:00." });
    }
    const nuevo = { fecha, hora_inicio: horaSql(horaNum), hora_fin: horaSql(horaNum + dur), duracion_horas: dur };

    // Mismo criterio que reservar_si_libre: choca con otra reserva activa del
    // mismo servicio o con un bloqueo del staff (sin contarse a sí misma).
    const { data: choques, error: errorChoque } = await supabase
      .from("reservaciones")
      .select("id")
      .eq("fecha", fecha)
      .neq("estado", "cancelada")
      .neq("id", id)
      .in("servicio", [actual.servicio, "bloqueo"])
      .lt("hora_inicio", nuevo.hora_fin)
      .gt("hora_fin", nuevo.hora_inicio)
      .limit(1);
    if (errorChoque) {
      return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
    }
    if (choques?.length) {
      return res.json({ ok: false, error: "Ese horario ya está ocupado o bloqueado. Elige otro." });
    }

    const { data, error } = await supabase
      .from("reservaciones")
      .update(nuevo)
      .eq("id", id)
      .neq("estado", "cancelada")
      .select(CAMPOS);
    if (error) {
      return res.status(500).json({ ok: false, error: "No se pudo mover la reserva." });
    }
    const r = (data ?? [])[0];
    if (r && r.email) avisos.reservaMovida(r);
    return res.json({ ok: Boolean(r), correo: Boolean(r?.email) && correoConfigurado(), error: r ? undefined : "La reserva ya cambió. Recarga la página." });
  }

  if (accion === "bloquear") {
    const fecha = String(req.body?.fecha ?? "");
    const horaNum = parseHora(req.body?.hora ?? HORA_APERTURA);
    const dur = parseEntero(req.body?.duracion ?? 1);
    const motivo = String(req.body?.motivo ?? "").trim().slice(0, 300) || "Bloqueo del staff";

    if (!fecha) {
      return res.json({ ok: false, error: "Falta la fecha." });
    }
    if (!esFechaValida(fecha)) {
      return res.json({ ok: false, error: "Fecha no válida." });
    }
    if (!Number.isInteger(horaNum) || !Number.isInteger(dur) || dur < 1 ||
        horaNum < HORA_APERTURA || horaNum + dur > HORA_CIERRE) {
      return res.json({ ok: false, error: "Fuera del horario 11:00–23:00." });
    }

    const { error } = await supabase.from("reservaciones").insert({
      servicio: "bloqueo",
      fecha,
      hora_inicio: horaSql(horaNum),
      hora_fin: horaSql(horaNum + dur),
      duracion_horas: dur,
      nombre: "BLOQUEO",
      telefono: "",
      email: "",
      mensaje: motivo,
      estado: "confirmada",
    });
    if (error) {
      return res.status(500).json({ ok: false, error: "No se pudo bloquear el horario." });
    }
    return res.json({ ok: true });
  }

  res.json({ ok: false, error: "Acción no válida." });
});

export default router;
