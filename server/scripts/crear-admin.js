// Reemplaza a api/crear-admin.php.
// Uso: npm run seed:admin
import bcrypt from "bcryptjs";
import "dotenv/config";
import { supabase } from "../src/supabaseClient.js";

const nombre = process.env.ADMIN_NOMBRE || "Staff El Sótano";
const email = process.env.ADMIN_EMAIL || "admin@elsotano.com";
const password = process.env.ADMIN_PASSWORD || "CambiaEstaClave123";

const password_hash = await bcrypt.hash(password, 10);
const { data, error } = await supabase
  .from("usuarios")
  .insert({ nombre, email, telefono: "", password_hash, rol: "admin" })
  .select("id")
  .single();

if (error) {
  console.error("No se pudo crear el admin:", error.message);
  process.exit(1);
}

console.log(`✔ Admin creado (id ${data.id}) con email ${email}.`);
console.log("Cambia la contraseña o borra este usuario si ya no lo necesitas.");
