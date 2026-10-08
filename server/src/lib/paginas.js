// Entrega las páginas públicas con el contenido editable ya puesto. En el HTML
// cada dato editable va entre marcas <!--c:clave-->valor<!--/c-->: lo de en
// medio es el valor por defecto, así que si algo falla la página se ve igual.
import fs from "node:fs/promises";
import path from "node:path";
import {
  obtenerContenido,
  SERVICIOS_EDITABLES,
  CAMPOS_TEXTO,
  textosCambiados,
  hora12,
  hora24,
  precioTexto,
} from "./contenido.js";

const enProduccion = process.env.NODE_ENV === "production";
const archivos = new Map();

async function leerHtml(ruta) {
  if (enProduccion && archivos.has(ruta)) return archivos.get(ruta);
  const html = await fs.readFile(ruta, "utf8");
  if (enProduccion) archivos.set(ruta, html);
  return html;
}

const escapar = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Valores (ya en HTML seguro) que se ponen en cada marca.
function valores(c, servicio) {
  const v = {
    "atencion.dias": escapar(c.atencion.dias),
    "atencion.horas": `${hora12(c.atencion.apertura)} – ${hora12(c.atencion.cierre)}`,
    "atencion.horas-span": `${hora12(c.atencion.apertura, true)} – ${hora12(c.atencion.cierre, true)}`,
    // JSON dentro de <script>: "<" escapado para que nadie pueda cerrar la etiqueta.
    datos: `<script>window.CONTENIDO = ${JSON.stringify({ precios: c.precios, horarios: c.horarios }).replace(/</g, "\\u003c")};</script>`,
  };
  for (const id of Object.keys(SERVICIOS_EDITABLES)) {
    v[`precio.${id}`] = precioTexto(c.precios[id]);
  }
  // Solo los textos que cambió el staff; los demás se quedan como en el HTML.
  for (const [clave, valor] of Object.entries(textosCambiados(c.textos))) {
    if (CAMPOS_TEXTO[clave]?.tipo === "lista") {
      v[`lista.${clave}`] = "\n" + valor.map((p) => `                <li>${escapar(p)}</li>`).join("\n") + "\n              ";
    } else {
      v[`texto.${clave}`] = escapar(valor);
    }
  }
  const h = c.horarios[servicio];
  if (h) v["reserva.horario"] = `${hora24(h.apertura)} a ${hora24(h.cierre)}`;
  return v;
}

export function rellenar(html, v) {
  return html.replace(/<!--c:([\w.-]+)-->([\s\S]*?)<!--\/c-->/g, (todo, clave, porDefecto) =>
    clave in v ? v[clave] : porDefecto,
  );
}

export function enviarPagina(archivo, { servicio } = {}) {
  return async (req, res, next) => {
    try {
      const html = await leerHtml(archivo);
      const c = await obtenerContenido();
      res.set("Cache-Control", "no-cache");
      res.type("html").send(rellenar(html, valores(c, servicio ?? req.params.servicio)));
    } catch (e) {
      console.error("No se pudo armar la página:", path.basename(archivo), e?.message);
      // Último recurso: el archivo tal cual, con sus valores por defecto.
      res.sendFile(archivo, (err) => err && next(err));
    }
  };
}
