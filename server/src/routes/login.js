import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../supabaseClient.js";
import { setSessionCookie } from "../middleware/auth.js";
import { crearLimite } from "../lib/limite.js";

const router = Router();

// Frena a quien intenta adivinar contraseñas: solo cuentan los intentos
// fallidos. 5 por conexión y 10 por correo cada 15 minutos.
const QUINCE_MIN = 15 * 60 * 1000;
const fallosPorIp = crearLimite({ maximo: 5, ventanaMs: QUINCE_MIN });
const fallosPorCorreo = crearLimite({ maximo: 10, ventanaMs: QUINCE_MIN });
const BLOQUEADO = "Demasiados intentos. Espera 15 minutos y vuelve a intentar.";

router.post("/", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (fallosPorIp.excedido(req) || fallosPorCorreo.excedido(req, email)) {
    return res.status(429).json({ ok: false, error: BLOQUEADO });
  }

  const { data: user, error } = await supabase
    .from("usuarios")
    .select("id, nombre, rol, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos." });
  }

  // Solo el staff (rol admin) puede iniciar sesión; cuentas viejas de
  // clientes se rechazan igual que una contraseña incorrecta.
  const valido =
    user && user.rol === "admin" && (await bcrypt.compare(password, user.password_hash));
  if (!valido) {
    fallosPorIp.registrar(req);
    if (email) fallosPorCorreo.registrar(req, email);
    return res.json({ ok: false, error: "Correo o contraseña incorrectos." });
  }

  const usuario = { id: user.id, nombre: user.nombre, rol: user.rol };
  setSessionCookie(res, usuario);
  res.json({ ok: true, usuario });
});

export default router;
