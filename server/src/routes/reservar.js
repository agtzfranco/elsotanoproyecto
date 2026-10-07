import { Router } from "express";
import { crearLimite } from "../lib/limite.js";
import { urlSitio } from "../lib/tokens.js";
import { avisos, correoConfigurado } from "../lib/correo.js";
import { crearReserva } from "../lib/reservaNueva.js";

const router = Router();

// Máximo 5 reservas por hora desde la misma conexión.
const limite = crearLimite({ maximo: 5, ventanaMs: 60 * 60 * 1000 });

router.post("/", async (req, res) => {
  if (limite.excedido(req)) {
    return res.status(429).json({
      ok: false,
      error: "Hiciste demasiadas reservas seguidas. Intenta más tarde o contáctanos.",
    });
  }

  const r = await crearReserva(req.body);
  if (!r.ok) {
    return res.status(r.status ?? 200).json({ ok: false, error: r.error });
  }

  limite.registrar(req);
  const enlace = `${urlSitio(req)}/mis-reservas/${r.token}`;
  avisos.reservaNueva(r.fila, enlace);
  res.json({
    ok: true,
    mensaje: "¡Listo, ya quedó tu reserva! Nos vemos en El Sótano.",
    enlace,
    correo: correoConfigurado(),
  });
});

export default router;
