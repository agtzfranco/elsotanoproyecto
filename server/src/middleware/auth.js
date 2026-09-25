import jwt from "jsonwebtoken";

const COOKIE_NAME = "session";
const TOKEN_TTL = "7d";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function signSessionToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  );
}

function setSessionCookie(res, usuario) {
  const token = signSessionToken(usuario);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

// Lee el token (si existe) y adjunta req.usuario, sin exigir sesión.
function attachUsuario(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = { id: payload.id, nombre: payload.nombre, rol: payload.rol };
    } catch {
      req.usuario = null;
    }
  } else {
    req.usuario = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.usuario) {
    return res
      .status(401)
      .json({ ok: false, error: "Debes iniciar sesión para reservar.", login: true });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== "admin") {
    return res
      .status(403)
      .json({ ok: false, error: "Solo el personal puede entrar aquí." });
  }
  next();
}

export {
  COOKIE_NAME,
  setSessionCookie,
  clearSessionCookie,
  attachUsuario,
  requireAuth,
  requireAdmin,
};
