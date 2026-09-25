import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../supabaseClient.js";
import { setSessionCookie } from "../middleware/auth.js";

const router = Router();

router.post("/", async (req, res) => {
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");

  const { data: user, error } = await supabase
    .from("usuarios")
    .select("id, nombre, rol, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }

  const valido = user && (await bcrypt.compare(password, user.password_hash));
  if (!valido) {
    return res.json({ ok: false, error: "Correo o contraseña incorrectos." });
  }

  const usuario = { id: user.id, nombre: user.nombre, rol: user.rol };
  setSessionCookie(res, usuario);
  res.json({ ok: true, usuario });
});

export default router;
