import crypto from "node:crypto";

// Token secreto que viaja en el enlace del correo; en la base solo guardamos su hash.
export function nuevoToken() {
  const token = crypto.randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// URL pública del sitio para los enlaces de los correos.
export function urlSitio(req) {
  const base = process.env.SITE_URL || `${req.protocol}://${req.get("host")}`;
  return base.replace(/\/+$/, "");
}
