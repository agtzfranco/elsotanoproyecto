import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

import { attachUsuario } from "./middleware/auth.js";
import usuarioRouter from "./routes/usuario.js";
import loginRouter from "./routes/login.js";
import logoutRouter from "./routes/logout.js";
import disponibilidadRouter from "./routes/disponibilidad.js";
import reservarRouter from "./routes/reservar.js";
import reservasRouter from "./routes/reservas.js";
import adminRouter from "./routes/admin.js";
import calendarioRouter from "./routes/calendario.js";
import { asegurarAdmin, confirmarPendientes } from "./lib/adminInicial.js";
import { SERVICIOS } from "./lib/reglas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "../../elsotano");

const app = express();
// Render (y la mayoría de hosts) ponen un proxy delante: así req.ip y
// req.protocol reflejan al visitante real.
app.set("trust proxy", 1);

if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
}
app.use(express.json());
app.use(cookieParser());
app.use(attachUsuario);

app.use("/api/usuario", usuarioRouter);
app.use("/api/login", loginRouter);
app.use("/api/logout", logoutRouter);
app.use("/api/disponibilidad", disponibilidadRouter);
app.use("/api/reservar", reservarRouter);
app.use("/api/reservas", reservasRouter);
app.use("/api/admin", adminRouter);
app.use("/api/calendario", calendarioRouter);

// Links limpios con ruta: /reservas/sala-ensayo y /mis-reservas/<token>.
// Los links viejos con ?servicio= o ?token= se redirigen a la ruta nueva.
app.get("/reservas", (req, res, next) => {
  const servicio = req.query.servicio;
  if (!servicio) return next();
  res.redirect(301, `/reservas/${encodeURIComponent(String(servicio))}`);
});
app.get("/reservas/:servicio", (req, res) => {
  if (!SERVICIOS[req.params.servicio]) return res.redirect("/#servicios");
  res.sendFile(path.join(FRONTEND_DIR, "reservas.html"));
});
app.get("/mis-reservas", (req, res, next) => {
  const token = req.query.token;
  if (!token) return next();
  res.redirect(301, `/mis-reservas/${encodeURIComponent(String(token))}`);
});
app.get("/mis-reservas/:token", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "mis-reservas.html"));
});

// El login del staff vive en una ruta secreta (variable STAFF_PATH en Render).
// /login, /login.html y /admin responden 404 a quien no tenga sesión, como si
// no existieran. Sin STAFF_PATH válida el login no se sirve en ninguna ruta.
const STAFF_PATH = String(process.env.STAFF_PATH ?? "").trim().replace(/^\/+|\/+$/g, "");
const staffPathValida = /^[A-Za-z0-9_-]{12,}$/.test(STAFF_PATH);
if (!staffPathValida) {
  console.warn("STAFF_PATH falta o es muy corta (mínimo 12 letras/números): el login del staff está apagado.");
}
// Misma respuesta que cualquier dirección que no existe.
function noExiste(_req, res) {
  res.status(404).type("text").send("Not Found");
}
app.get(["/login", "/login.html"], noExiste);
if (staffPathValida) {
  app.get(`/${STAFF_PATH}`, (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Robots-Tag", "noindex, nofollow");
    res.set("Referrer-Policy", "no-referrer");
    res.sendFile(path.join(FRONTEND_DIR, "login.html"));
  });
}

// El panel solo se entrega a una sesión de admin; a los demás, 404.
app.get(["/admin", "/admin.html"], (req, res) => {
  if (req.usuario?.rol !== "admin") return noExiste(req, res);
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(FRONTEND_DIR, "admin.html"));
});

// Links limpios: /reservas en vez de /reservas.html. Los links viejos
// (correos ya enviados, favoritos) se redirigen a la versión sin .html.
app.get(/^\/([\w-]+)\.html$/, (req, res) => {
  const pagina = req.params[0] === "index" ? "" : req.params[0];
  const consulta = req.originalUrl.slice(req.path.length);
  res.redirect(301, `/${pagina}${consulta}`);
});

// Sirve el sitio estático (antes servido directamente por Apache/XAMPP).
app.use(express.static(FRONTEND_DIR, { extensions: ["html"] }));
app.use(noExiste);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`El Sótano server escuchando en http://localhost:${PORT}`);
});
asegurarAdmin().catch((e) => console.error("Cuenta admin:", e.message));
confirmarPendientes().catch((e) => console.error("Pendientes:", e.message));
