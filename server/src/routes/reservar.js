import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const { servicio, fecha, hora } = req.body ?? {};
  for (const [campo, valor] of Object.entries({ servicio, fecha, hora })) {
    if (!valor) {
      return res.json({ ok: false, error: `Falta el campo: ${campo}` });
    }
  }

  const duracion = parseInt(req.body?.duracion ?? 1, 10) || 1;
  const horaNum = parseInt(String(hora).slice(0, 2), 10);
  const horaFinNum = horaNum + duracion;
  if (horaNum < 11 || horaFinNum > 23) {
    return res.json({ ok: false, error: "El horario debe estar entre 11:00 y 23:00." });
  }
  const horaInicio = `${String(horaNum).padStart(2, "0")}:00:00`;
  const horaFin = `${String(horaFinNum).padStart(2, "0")}:00:00`;

  const { data: u, error: usuarioError } = await supabase
    .from("usuarios")
    .select("nombre, email, telefono")
    .eq("id", req.usuario.id)
    .single();
  if (usuarioError) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }

  const { count, error: conflictoError } = await supabase
    .from("reservaciones")
    .select("id", { count: "exact", head: true })
    .eq("fecha", fecha)
    .neq("estado", "cancelada")
    .or(`servicio.eq.${servicio},servicio.eq.bloqueo`)
    .lt("hora_inicio", horaFin)
    .gt("hora_fin", horaInicio);
  if (conflictoError) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  if ((count ?? 0) > 0) {
    return res.json({ ok: false, error: "Ese horario ya fue reservado o está bloqueado. Elige otro." });
  }

  const { error: insertError } = await supabase.from("reservaciones").insert({
    usuario_id: req.usuario.id,
    servicio,
    fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    duracion_horas: duracion,
    nombre: u.nombre,
    telefono: u.telefono,
    email: u.email,
    mensaje: req.body?.mensaje ?? "",
    estado: "pendiente",
  });
  if (insertError) {
    return res.status(500).json({ ok: false, error: "No se pudo registrar la reserva." });
  }

  res.json({ ok: true, mensaje: "¡Reserva registrada! Te contactaremos para confirmarla." });
});

export default router;
