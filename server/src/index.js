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
import registroRouter from "./routes/registro.js";
import disponibilidadRouter from "./routes/disponibilidad.js";
import reservarRouter from "./routes/reservar.js";
import reservasRouter from "./routes/reservas.js";
import adminRouter from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "../../elsotano");

const app = express();

if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
}
app.use(express.json());
app.use(cookieParser());
app.use(attachUsuario);

app.use("/api/usuario", usuarioRouter);
app.use("/api/login", loginRouter);
app.use("/api/logout", logoutRouter);
app.use("/api/registro", registroRouter);
app.use("/api/disponibilidad", disponibilidadRouter);
app.use("/api/reservar", reservarRouter);
app.use("/api/reservas", reservasRouter);
app.use("/api/admin", adminRouter);

// Sirve el sitio estático (antes servido directamente por Apache/XAMPP).
app.use(express.static(FRONTEND_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`El Sótano server escuchando en http://localhost:${PORT}`);
});
