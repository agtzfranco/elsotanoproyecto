import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../supabaseClient.js";
import { setSessionCookie } from "../middleware/auth.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/", async (req, res) => {
  const nombre = String(req.body?.nombre ?? "").trim();
  const emailRaw = String(req.body?.email ?? "").trim();
  const telefono = String(req.body?.telefono ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (nombre.length < 3) {
    return res.json({ ok: false, error: "El nombre debe tener al menos 3 caracteres." });
  }
  const email = EMAIL_RE.test(emailRaw) ? emailRaw : null;
  if (!email) {
    return res.json({ ok: false, error: "Correo electrónico no válido." });
  }
  if (password.length < 6) {
    return res.json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const { data: existente, error: buscarError } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (buscarError) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }
  if (existente) {
    return res.json({ ok: false, error: "Ya existe una cuenta con ese correo." });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { data: creado, error: insertError } = await supabase
    .from("usuarios")
    .insert({ nombre, email, telefono, password_hash })
    .select("id, nombre, rol")
    .single();

  if (insertError) {
    return res.status(500).json({ ok: false, error: "No se pudo crear la cuenta." });
  }

  const usuario = { id: creado.id, nombre: creado.nombre, rol: creado.rol };
  setSessionCookie(res, usuario);
  res.json({ ok: true, usuario: { id: usuario.id, nombre: usuario.nombre } });
});

export default router;
