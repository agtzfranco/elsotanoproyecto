// Crea o actualiza la cuenta del staff a partir de variables de entorno, sin
// necesitar una terminal en el servidor. En Render basta con poner
// ADMIN_EMAIL y ADMIN_PASSWORD (y opcionalmente ADMIN_NOMBRE) y reiniciar:
// si el correo no existe se crea como admin; si existe, se le pone esa
// contraseña. Así también sirve para recuperar el acceso.
import bcrypt from "bcryptjs";
import { supabase } from "../supabaseClient.js";

export async function asegurarAdmin() {
  const email = String(process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD ?? "");
  if (!email || !password) return;
  if (password.length < 8) {
    console.warn("ADMIN_PASSWORD debe tener al menos 8 caracteres; no se tocó la cuenta.");
    return;
  }
  const nombre = String(process.env.ADMIN_NOMBRE ?? "").trim() || "Staff El Sótano";
  const password_hash = await bcrypt.hash(password, 10);

  const { data: existente, error: errorBuscar } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (errorBuscar) {
    console.error("No se pudo revisar la cuenta admin:", errorBuscar.message);
    return;
  }

  const { error } = existente
    ? await supabase
        .from("usuarios")
        .update({ password_hash, rol: "admin", nombre })
        .eq("id", existente.id)
    : await supabase
        .from("usuarios")
        .insert({ nombre, email, telefono: "", password_hash, rol: "admin" });
  if (error) {
    console.error("No se pudo guardar la cuenta admin:", error.message);
    return;
  }
  console.log(`✔ Cuenta admin lista: ${email}`);
}

// Las reservas ya no esperan confirmación del staff: las que quedaron
// "pendiente" de antes se pasan a confirmadas al arrancar.
export async function confirmarPendientes() {
  const { data, error } = await supabase
    .from("reservaciones")
    .update({ estado: "confirmada" })
    .eq("estado", "pendiente")
    .select("id");
  if (error) {
    console.error("No se pudieron confirmar las reservas pendientes:", error.message);
    return;
  }
  if (data?.length) console.log(`✔ ${data.length} reserva(s) pendiente(s) pasaron a confirmadas.`);
}
