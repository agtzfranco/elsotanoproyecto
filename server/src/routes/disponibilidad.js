import { Router } from "express";
import { supabase } from "../supabaseClient.js";

const router = Router();

router.get("/", async (req, res) => {
  const servicio = String(req.query.servicio ?? "");
  const fecha = String(req.query.fecha ?? "");

  if (!servicio || !fecha) {
    return res.json({ error: "Faltan servicio o fecha" });
  }

  const { data: reservas, error } = await supabase
    .from("reservaciones")
    .select("hora_inicio, hora_fin")
    .eq("fecha", fecha)
    .neq("estado", "cancelada")
    .or(`servicio.eq.${servicio},servicio.eq.bloqueo`);

  if (error) {
    return res.status(500).json({ error: "No se pudo conectar a la base de datos" });
  }

  const slots = [];
  for (let hora = 11; hora < 23; hora++) {
    const inicioSlot = hora;
    const finSlot = hora + 1;
    const ocupado = (reservas ?? []).some((r) => {
      const rInicio = parseInt(r.hora_inicio.slice(0, 2), 10);
      const rFin = parseInt(r.hora_fin.slice(0, 2), 10);
      return inicioSlot < rFin && finSlot > rInicio;
    });
    slots.push({ hora: `${String(hora).padStart(2, "0")}:00`, ocupado });
  }

  res.json({ servicio, fecha, slots });
});

export default router;
