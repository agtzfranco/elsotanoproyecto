import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { SERVICIOS, ahoraLocal, esFechaValida } from "../lib/reglas.js";
import { horarioDe } from "../lib/contenido.js";

const router = Router();

router.get("/", async (req, res) => {
  const servicio = String(req.query.servicio ?? "");
  const fecha = String(req.query.fecha ?? "");

  if (!servicio || !fecha) {
    return res.json({ error: "Faltan servicio o fecha" });
  }
  if (!SERVICIOS[servicio]) {
    return res.json({ error: "Servicio no válido" });
  }
  if (!esFechaValida(fecha)) {
    return res.json({ error: "Fecha no válida" });
  }

  const { data: reservas, error } = await supabase
    .from("reservaciones")
    .select("hora_inicio, hora_fin")
    .eq("fecha", fecha)
    .neq("estado", "cancelada")
    .in("servicio", [servicio, "bloqueo"]);

  if (error) {
    return res.status(500).json({ error: "No se pudo conectar a la base de datos" });
  }

  // Cada servicio tiene su horario, editable desde el panel.
  const { apertura, cierre } = await horarioDe(servicio);

  // Las horas que ya pasaron (o días anteriores) se muestran como ocupadas.
  const ahora = ahoraLocal();
  const horaMinima =
    fecha < ahora.fecha ? cierre : fecha === ahora.fecha ? ahora.hora + 1 : 0;

  const slots = [];
  for (let hora = apertura; hora < cierre; hora++) {
    const inicioSlot = hora;
    const finSlot = hora + 1;
    const ocupado =
      hora < horaMinima ||
      (reservas ?? []).some((r) => {
        const rInicio = parseInt(r.hora_inicio.slice(0, 2), 10);
        const rFin = parseInt(r.hora_fin.slice(0, 2), 10);
        return inicioSlot < rFin && finSlot > rInicio;
      });
    slots.push({ hora: `${String(hora).padStart(2, "0")}:00`, ocupado });
  }

  res.json({ servicio, fecha, slots });
});

export default router;
