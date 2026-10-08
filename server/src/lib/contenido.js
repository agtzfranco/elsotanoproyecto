// Contenido editable desde el panel (precios, horarios...). Vive en la tabla
// `contenido` de Supabase, una fila por sección. Cualquier dato que falte, esté
// vacío o no sea válido se reemplaza por el valor por defecto, así que un
// error en la base nunca deja el sitio roto: se ve igual que antes del panel.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "../supabaseClient.js";
import { HORA_APERTURA, HORA_CIERRE } from "./reglas.js";

// Servicios que se reservan en línea y tienen precio y horario propios.
export const SERVICIOS_EDITABLES = {
  "sala-ensayo": { nombre: "Sala de Ensayo", unidad: "hora" },
  fotografia: { nombre: "Renta de Estudio Fotográfico", unidad: "hora" },
  equipo: { nombre: "Renta de Equipo", unidad: "día" },
};

const horarioBase = () => ({ apertura: HORA_APERTURA, cierre: HORA_CIERRE });

export const POR_DEFECTO = {
  precios: { "sala-ensayo": 250, fotografia: 350, equipo: 9000 },
  horarios: {
    "sala-ensayo": horarioBase(),
    fotografia: horarioBase(),
    equipo: horarioBase(),
  },
  atencion: { dias: "Lunes a domingo", ...horarioBase() },
};

export const PRECIO_MAXIMO = 1_000_000;

// Textos editables de la página de inicio. Su valor por defecto es el que
// está escrito en index.html entre <!--c:texto.clave--> y <!--/c--> (o
// <!--c:lista.clave--> para las listas de puntos), así hay un solo lugar
// donde vive el texto original. `max` es el límite de letras por texto (o
// por punto, en las listas).
export const CAMPOS_TEXTO = {
  "inicio.titulo": { tipo: "texto", max: 60 },
  "inicio.resaltado": { tipo: "texto", max: 30 },
  "inicio.texto": { tipo: "texto", max: 400 },
  "nosotros.texto": { tipo: "texto", max: 600 },
  "servicio.sala.titulo": { tipo: "texto", max: 50 },
  "servicio.sala.puntos": { tipo: "lista", max: 140 },
  "servicio.fotografia.titulo": { tipo: "texto", max: 50 },
  "servicio.fotografia.puntos": { tipo: "lista", max: 140 },
  "servicio.grabacion.titulo": { tipo: "texto", max: 50 },
  "servicio.grabacion.puntos": { tipo: "lista", max: 140 },
  "servicio.cotiza.titulo": { tipo: "texto", max: 50 },
  "servicio.cotiza.puntos": { tipo: "lista", max: 140 },
  "equipo.intro": { tipo: "texto", max: 300 },
  "equipo.nota": { tipo: "texto", max: 300 },
  "pie.texto": { tipo: "texto", max: 300 },
};
export const PUNTOS_MAXIMOS = 10;

const INDEX_HTML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../elsotano/index.html");
const ENTIDADES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
const textoPlano = (html) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTIDADES[e])
    .replace(/\s+/g, " ")
    .trim();

// Lee de index.html los textos originales (una sola vez).
let textosOriginales = null;
export function textosPorDefecto() {
  if (textosOriginales) return textosOriginales;
  const t = {};
  try {
    const html = fs.readFileSync(INDEX_HTML, "utf8");
    for (const [, tipo, clave, dentro] of html.matchAll(/<!--c:(texto|lista)\.([\w.-]+)-->([\s\S]*?)<!--\/c-->/g)) {
      if (CAMPOS_TEXTO[clave]?.tipo !== tipo) continue;
      t[clave] =
        tipo === "lista"
          ? [...dentro.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => textoPlano(m[1])).filter(Boolean)
          : textoPlano(dentro);
    }
  } catch (e) {
    console.error("No se pudieron leer los textos de index.html:", e.message);
  }
  textosOriginales = t;
  return t;
}

// Un texto vacío (o una lista sin puntos) vuelve al original.
function limpiarTextos(crudo, errores) {
  const originales = textosPorDefecto();
  const t = { ...originales };
  if (!crudo || typeof crudo !== "object") return t;
  for (const [clave, campo] of Object.entries(CAMPOS_TEXTO)) {
    const v = crudo[clave];
    if (v === undefined || v === null) continue;
    if (campo.tipo === "lista") {
      const puntos = (Array.isArray(v) ? v : String(v).split("\n"))
        .map((x) => String(x ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (puntos.length > PUNTOS_MAXIMOS) errores.push(`Máximo ${PUNTOS_MAXIMOS} puntos por servicio.`);
      if (puntos.some((x) => x.length > campo.max)) errores.push(`Cada punto puede tener hasta ${campo.max} letras.`);
      if (puntos.length) t[clave] = puntos.slice(0, PUNTOS_MAXIMOS).map((x) => x.slice(0, campo.max));
    } else {
      const texto = String(v).replace(/\s+/g, " ").trim();
      if (texto.length > campo.max) errores.push(`Un texto pasa del límite de ${campo.max} letras.`);
      if (texto) t[clave] = texto.slice(0, campo.max);
    }
  }
  return t;
}

const esEntero = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
// "" y null no cuentan como 0.
const numero = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

function limpiarHorario(h, base) {
  const apertura = numero(h?.apertura);
  const cierre = numero(h?.cierre);
  if (esEntero(apertura, 0, 23) && esEntero(cierre, apertura + 1, 24)) {
    return { apertura, cierre };
  }
  return { apertura: base.apertura, cierre: base.cierre };
}

// Toma lo que venga (de la base o del panel) y regresa siempre un objeto
// completo y válido. `errores` junta lo que se descartó, para avisar al panel.
export function limpiarContenido(crudo = {}, errores = []) {
  const c = structuredClone(POR_DEFECTO);

  for (const id of Object.keys(SERVICIOS_EDITABLES)) {
    const nombre = SERVICIOS_EDITABLES[id].nombre;
    const p = crudo.precios?.[id];
    if (p !== undefined) {
      const n = numero(p);
      if (esEntero(n, 0, PRECIO_MAXIMO)) c.precios[id] = n;
      else errores.push(`Precio de ${nombre}: escribe un número entero.`);
    }
    const h = crudo.horarios?.[id];
    if (h) {
      const limpio = limpiarHorario(h, c.horarios[id]);
      if (limpio.apertura !== numero(h.apertura) || limpio.cierre !== numero(h.cierre)) {
        errores.push(`Horario de ${nombre}: el cierre debe ser después de la apertura.`);
      }
      c.horarios[id] = limpio;
    }
  }

  const a = crudo.atencion;
  if (a) {
    const dias = String(a.dias ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (dias) c.atencion.dias = dias;
    const limpio = limpiarHorario(a, c.atencion);
    if (limpio.apertura !== numero(a.apertura) || limpio.cierre !== numero(a.cierre)) {
      errores.push("Horario de atención: el cierre debe ser después de la apertura.");
    }
    Object.assign(c.atencion, limpio);
  }
  c.textos = limpiarTextos(crudo.textos, errores);
  return c;
}

const SECCIONES = ["precios", "horarios", "atencion", "textos"];
const VIGENCIA_MS = 30_000;
let cache = null;
let cacheEn = 0;

// Lee el contenido (con caché de 30 s). Si la tabla no existe todavía o
// Supabase no responde, usa lo último que se leyó o los valores por defecto.
export async function obtenerContenido() {
  if (cache && Date.now() - cacheEn < VIGENCIA_MS) return cache;
  try {
    const { data, error } = await supabase
      .from("contenido")
      .select("clave, valor")
      .in("clave", SECCIONES)
      // Si Supabase tarda, la página no espera: sale con lo que ya tenía.
      .abortSignal(AbortSignal.timeout(3000));
    if (error) throw error;
    const crudo = Object.fromEntries((data ?? []).map((f) => [f.clave, f.valor]));
    cache = limpiarContenido(crudo);
  } catch (e) {
    if (!cache) console.error("Contenido: se usan los valores por defecto.", e?.message ?? e);
    cache = cache ?? limpiarContenido();
  }
  cacheEn = Date.now();
  return cache;
}

// Textos que el staff cambió (distintos del original de index.html). Solo
// esos se guardan, para que un ajuste futuro al HTML no quede tapado.
export function textosCambiados(textos) {
  const originales = textosPorDefecto();
  return Object.fromEntries(
    Object.entries(textos ?? {}).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(originales[k])),
  );
}

export async function guardarContenido(nuevo) {
  const filas = SECCIONES.map((clave) => ({
    clave,
    valor: clave === "textos" ? textosCambiados(nuevo.textos) : nuevo[clave],
    actualizado_en: new Date().toISOString(),
  }));
  const { error } = await supabase.from("contenido").upsert(filas, { onConflict: "clave" });
  if (error) throw error;
  cache = nuevo;
  cacheEn = Date.now();
}

// Horario de un servicio. Los bloqueos del staff y los servicios que no se
// editan usan el rango más amplio, para poder cubrir cualquier horario.
export async function horarioDe(servicio) {
  const c = await obtenerContenido();
  if (c.horarios[servicio]) return c.horarios[servicio];
  return horarioGeneral(c);
}

export function horarioGeneral(c) {
  const hs = Object.values(c.horarios);
  return {
    apertura: Math.min(...hs.map((h) => h.apertura)),
    cierre: Math.max(...hs.map((h) => h.cierre)),
  };
}

// 11 -> "11:00 a.m.", 23 -> "11:00 p.m.", 24 -> "12:00 a.m."
export function hora12(h, conSpan = false) {
  const hh = h % 12 === 0 ? 12 : h % 12;
  const sufijo = h % 24 < 12 ? "a.m." : "p.m.";
  return conSpan ? `${hh}:00 <span>${sufijo}</span>` : `${hh}:00 ${sufijo}`;
}

export const hora24 = (h) => `${String(h).padStart(2, "0")}:00`;
export const precioTexto = (n) => `$${n.toLocaleString("en-US")}`;
