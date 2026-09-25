import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAdmin);

router.get("/", async (req, res) => {
  const accion = req.query.accion ?? "";
  if (accion !== "reservas") {
    return res.json({ ok: false, error: "Acción no válida." });
  }
  const { data, error } = await supabase
    .from("reservaciones")
    .select("id, servicio, fecha, hora_inicio, hora_fin, duracion_horas, nombre, telefono, email, mensaje, estado");
  if (error) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  res.json({ reservas: data ?? [] });
});

router.post("/", async (req, res) => {
  const accion = req.body?.accion ?? "";

  if (accion === "reservas") {
    const { data, error } = await supabase
      .from("reservaciones")
      .select("id, servicio, fecha, hora_inicio, hora_fin, duracion_horas, nombre, telefono, email, mensaje, estado");
    if (error) {
      return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
    }
    return res.json({ reservas: data ?? [] });
  }

  if (accion === "confirmar" || accion === "cancelar") {
    const estado = accion === "confirmar" ? "confirmada" : "cancelada";
    const { data, error } = await supabase
      .from("reservaciones")
      .update({ estado })
      .eq("id", req.body?.id)
      .select("id");
    if (error) {
      return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
    }
    return res.json({ ok: (data ?? []).length > 0 });
  }

  if (accion === "bloquear") {
    const fecha = req.body?.fecha ?? "";
    const horaNum = parseInt(req.body?.hora ?? 11, 10) || 11;
    const dur = Math.max(1, parseInt(req.body?.duracion ?? 1, 10) || 1);
    const motivo = String(req.body?.motivo ?? "").trim() || "Bloqueo del staff";

    if (!fecha) {
      return res.json({ ok: false, error: "Falta la fecha." });
    }
    if (horaNum < 11 || horaNum + dur > 23) {
      return res.json({ ok: false, error: "Fuera del horario 11:00–23:00." });
    }

    const { error } = await supabase.from("reservaciones").insert({
      servicio: "bloqueo",
      fecha,
      hora_inicio: `${String(horaNum).padStart(2, "0")}:00:00`,
      hora_fin: `${String(horaNum + dur).padStart(2, "0")}:00:00`,
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
