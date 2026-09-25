import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("reservaciones")
    .select("id, servicio, fecha, hora_inicio, hora_fin, duracion_horas, estado")
    .eq("usuario_id", req.usuario.id)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: true });

  if (error) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  res.json({ reservas: data ?? [] });
});

router.post("/", requireAuth, async (req, res) => {
  if (req.body?.accion !== "cancelar") {
    return res.json({ ok: false, error: "Acción no válida." });
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("reservaciones")
    .update({ estado: "cancelada" })
    .eq("id", req.body?.id)
    .eq("usuario_id", req.usuario.id)
    .gte("fecha", hoy)
    .neq("estado", "cancelada")
    .select("id");

  if (error) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  res.json({ ok: (data ?? []).length > 0 });
});

export default router;
