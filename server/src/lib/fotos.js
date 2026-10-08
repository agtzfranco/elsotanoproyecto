// Fotos subidas desde el panel: se convierten a WebP en dos tamaños (para
// celular y para pantalla grande), sin datos EXIF, y se guardan en el bucket
// público "fotos" de Supabase Storage.
import crypto from "node:crypto";
import sharp from "sharp";
import { supabase } from "../supabaseClient.js";
import { BUCKET_FOTOS } from "./contenido.js";

sharp.concurrency(1); // el plan gratuito de Render tiene poca memoria
export const TAMANOS = { grande: 1600, chica: 800 };
export const BYTES_MAXIMOS = 12 * 1024 * 1024;

async function asegurarBucket() {
  const { error } = await supabase.storage.createBucket(BUCKET_FOTOS, {
    public: true,
    fileSizeLimit: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/webp"],
  });
  if (error && !/exist/i.test(error.message)) throw error;
}

async function subir(ruta, buffer) {
  const opciones = { contentType: "image/webp", cacheControl: "31536000", upsert: false };
  let { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, buffer, opciones);
  if (error && /not found/i.test(error.message)) {
    // Primera foto: si falta el bucket, se crea y se reintenta.
    await asegurarBucket();
    ({ error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, buffer, opciones));
  }
  if (error) throw error;
  return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl;
}

// Recibe la imagen tal cual (JPEG, PNG, WebP...) y regresa
// { grande, chica } con las direcciones públicas. Si no es una imagen
// válida lanza un error con `esImagenInvalida`.
export async function procesarFoto(lugar, buffer) {
  let imagen;
  try {
    imagen = sharp(buffer, { limitInputPixels: 50_000_000 }).rotate();
    await imagen.metadata();
  } catch {
    throw Object.assign(new Error("No es una imagen válida."), { esImagenInvalida: true });
  }
  const id = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const carpeta = lugar.replace(/\./g, "-");
  const urls = {};
  for (const [tam, ancho] of Object.entries(TAMANOS)) {
    let webp;
    try {
      webp = await imagen
        .clone()
        .resize({ width: ancho, height: ancho, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw Object.assign(new Error("No es una imagen válida."), { esImagenInvalida: true });
    }
    urls[tam] = await subir(`${carpeta}/${id}-${ancho}.webp`, webp);
  }
  return urls;
}
