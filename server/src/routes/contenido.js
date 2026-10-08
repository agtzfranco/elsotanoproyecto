import express, { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  obtenerContenido,
  guardarContenido,
  limpiarContenido,
  CAMPOS_FOTO,
} from "../lib/contenido.js";
import { procesarFoto, BYTES_MAXIMOS } from "../lib/fotos.js";

const router = Router();

// Público: lo que el sitio y el panel necesitan para pintar precios y horarios.
router.get("/", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await obtenerContenido());
});

// Solo el staff con sesión puede cambiar el contenido.
router.put("/", requireAdmin, async (req, res) => {
  const errores = [];
  // Lo que no venga en la petición se queda como está.
  const actual = await obtenerContenido();
  const cuerpo = req.body && typeof req.body === "object" ? req.body : {};
  const nuevo = limpiarContenido(
    {
      ...actual,
      ...cuerpo,
      textos: { ...actual.textos, ...cuerpo.textos },
      // Las fotos solo se cambian subiendo una (abajo) o quitándola con null.
      fotos: Object.fromEntries(
        Object.entries(actual.fotos).filter(([k]) => !(cuerpo.fotos && k in cuerpo.fotos && cuerpo.fotos[k] === null)),
      ),
    },
    errores,
  );
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

// Sube o reemplaza una foto. El cuerpo es el archivo tal cual; el servidor
// lo convierte a WebP (1600 y 800 px) y lo guarda en Supabase Storage.
router.post(
  "/foto",
  requireAdmin,
  express.raw({ type: () => true, limit: BYTES_MAXIMOS }),
  async (req, res) => {
    const lugar = String(req.query.lugar ?? "");
    if (!CAMPOS_FOTO.includes(lugar)) {
      return res.status(400).json({ ok: false, error: "Lugar de foto no válido." });
    }
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ ok: false, error: "No llegó ninguna foto." });
    }
    let urls;
    try {
      urls = await procesarFoto(lugar, req.body);
    } catch (e) {
      if (e.esImagenInvalida) {
        return res.status(400).json({ ok: false, error: "Ese archivo no es una foto válida (usa JPG, PNG o WebP)." });
      }
      console.error("No se pudo subir la foto:", e?.message);
      return res.status(500).json({ ok: false, error: "No se pudo subir la foto. Intenta de nuevo." });
    }
    try {
      const actual = await obtenerContenido();
      const nuevo = limpiarContenido({ ...actual, fotos: { ...actual.fotos, [lugar]: urls } });
      await guardarContenido(nuevo);
      res.json({ ok: true, contenido: nuevo });
    } catch (e) {
      console.error("No se pudo guardar la foto:", e?.code, e?.message);
      res.status(500).json({ ok: false, error: "La foto se subió pero no se pudo guardar. Intenta de nuevo." });
    }
  },
);

// Archivo demasiado grande u otro error al leer el cuerpo.
router.use((err, _req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ ok: false, error: "La foto pesa demasiado (máximo 12 MB)." });
  }
  next(err);
});

export default router;
