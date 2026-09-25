import { Router } from "express";

const router = Router();

// Equivalente a usuario.php: devuelve el usuario de la sesión (o null).
router.get("/", (req, res) => {
  if (req.usuario) {
    res.json({ usuario: req.usuario });
  } else {
    res.json({ usuario: null });
  }
});

export default router;
