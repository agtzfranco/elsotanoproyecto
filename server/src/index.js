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

// Links limpios: /reservas en vez de /reservas.html. Los links viejos
// (correos ya enviados, favoritos) se redirigen a la versión sin .html.
app.get(/^\/([\w-]+)\.html$/, (req, res) => {
  const pagina = req.params[0] === "index" ? "" : req.params[0];
  const consulta = req.originalUrl.slice(req.path.length);
  res.redirect(301, `/${pagina}${consulta}`);
});

// El panel solo se entrega a una sesión de admin; a los demás los manda al
// login sin enseñar ni un segundo de la página.
app.get("/admin", (req, res) => {
  if (req.usuario?.rol !== "admin") return res.redirect("/login");
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(FRONTEND_DIR, "admin.html"));
});

// Sirve el sitio estático (antes servido directamente por Apache/XAMPP).
app.use(express.static(FRONTEND_DIR, { extensions: ["html"] }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`El Sótano server escuchando en http://localhost:${PORT}`);
});
asegurarAdmin().catch((e) => console.error("Cuenta admin:", e.message));
confirmarPendientes().catch((e) => console.error("Pendientes:", e.message));
