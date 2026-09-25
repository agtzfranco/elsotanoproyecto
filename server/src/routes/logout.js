import { Router } from "express";
import { clearSessionCookie } from "../middleware/auth.js";

const router = Router();

function logout(_req, res) {
  clearSessionCookie(res);
  res.json({ ok: true });
}

// El frontend llama a este endpoint con un fetch GET simple.
router.get("/", logout);
router.post("/", logout);

export default router;
