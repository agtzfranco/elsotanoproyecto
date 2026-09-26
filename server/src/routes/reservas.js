import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { hashToken } from "../lib/tokens.js";
import { ahoraLocal } from "../lib/reglas.js";
import { avisos } from "../lib/correo.js";

// Consulta y cancelación de una reserva con el enlace secreto del correo.
const router = Router();
const CAMPOS = "id, servicio, fecha, hora_inicio, hora_fin, duracion_horas, nombre, telefono, email, mensaje, estado";

function leerToken(valor) {
  const token = String(valor ?? "");
  return /^[\w-]{20,64}$/.test(token) ? token : null;
}

// Se puede cancelar mientras no haya empezado.
function sePuedeCancelar(r) {
  const ahora = ahoraLocal();
  if (r.estado === "cancelada") return false;
  if (r.fecha !== ahora.fecha) return r.fecha > ahora.fecha;
  return parseInt(r.hora_inicio.slice(0, 2), 10) > ahora.hora;
}

async function buscarPorToken(token) {
  return supabase
    .from("reservaciones")
    .select(CAMPOS)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
}

router.get("/", async (req, res) => {
  const token = leerToken(req.query.token);
  if (!token) {
    return res.json({ ok: false, error: "Enlace no válido." });
  }
  const { data: r, error } = await buscarPorToken(token);
  if (error) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  if (!r) {
    return res.json({ ok: false, error: "No encontramos esa reserva. Revisa el enlace de tu correo." });
  }
  res.json({
    ok: true,
    reserva: {
      servicio: r.servicio,
      fecha: r.fecha,
      hora_inicio: r.hora_inicio,
      hora_fin: r.hora_fin,
      nombre: r.nombre,
      estado: r.estado,
      cancelable: sePuedeCancelar(r),
    },
  });
});

router.post("/", async (req, res) => {
  if (req.body?.accion !== "cancelar") {
    return res.json({ ok: false, error: "Acción no válida." });
  }
  const token = leerToken(req.body?.token);
  if (!token) {
    return res.json({ ok: false, error: "Enlace no válido." });
  }

  const { data: r, error } = await buscarPorToken(token);
  if (error) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  if (!r || !sePuedeCancelar(r)) {
    return res.json({ ok: false, error: "Esta reserva ya no se puede cancelar en línea." });
  }

  const { data, error: updateError } = await supabase
    .from("reservaciones")
    .update({ estado: "cancelada" })
    .eq("id", r.id)
    .neq("estado", "cancelada")
    .select("id");
  if (updateError) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  const ok = (data ?? []).length > 0;
  if (ok) avisos.reservaCanceladaPorCliente(r);
  res.json({ ok });
});

export default router;
