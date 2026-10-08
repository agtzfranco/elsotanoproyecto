// Contenido editable desde el panel (precios, horarios...). Vive en la tabla
// `contenido` de Supabase, una fila por sección. Cualquier dato que falte, esté
// vacío o no sea válido se reemplaza por el valor por defecto, así que un
// error en la base nunca deja el sitio roto: se ve igual que antes del panel.
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
  return c;
}

const SECCIONES = ["precios", "horarios", "atencion"];
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

export async function guardarContenido(nuevo) {
  const filas = SECCIONES.map((clave) => ({
    clave,
    valor: nuevo[clave],
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
