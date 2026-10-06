import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { requireAdmin } from "../middleware/auth.js";
import { avisos, correoConfigurado } from "../lib/correo.js";
import { urlSitio } from "../lib/tokens.js";
import { crearReserva } from "../lib/reservaNueva.js";
import {
  HORA_APERTURA,
  HORA_CIERRE,
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
