import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  obtenerContenido,
  guardarContenido,
  limpiarContenido,
} from "../lib/contenido.js";

const router = Router();

// Público: lo que el sitio y el panel necesitan para pintar precios y horarios.
router.get("/", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await obtenerContenido());
});

// Solo el staff con sesión puede cambiar el contenido.
router.put("/", requireAdmin, async (req, res) => {
  const errores = [];
  const nuevo = limpiarContenido(req.body ?? {}, errores);
  if (errores.length) {
    return res.status(400).json({ ok: false, error: errores.join(" ") });
  }
  try {
    await guardarContenido(nuevo);
  } catch (e) {
    console.error("No se pudo guardar el contenido:", e?.code, e?.message);
    const sinTabla = ["PGRST205", "42P01"].includes(e?.code);
    return res.status(500).json({
      ok: false,
      error: sinTabla
        ? "Falta crear la tabla de contenido en Supabase (supabase/migrations/003_contenido.sql)."
        : "No se pudo guardar. Revisa la conexión con la base de datos.",
    });
  }
  res.json({ ok: true, contenido: nuevo });
});

export default router;
