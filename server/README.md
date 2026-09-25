# El Sótano — backend Node.js + Supabase

Reemplaza el backend PHP/MySQL (`elsotano/api/*.php`, `elsotano/database.sql`)
por un servidor Express que habla con Supabase (Postgres).

## 1. Crear el proyecto en Supabase

1. Crea un proyecto en https://supabase.com.
2. Abre el **SQL Editor** y ejecuta el contenido de `../supabase/schema.sql`
   (crea las tablas `usuarios` y `reservaciones`, con RLS habilitado y sin
   políticas públicas — solo el backend, con la service role key, puede
   leer/escribir).
3. En **Project Settings → API** copia:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (secreta) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Configurar el servidor

```bash
cd server
cp .env.example .env
# edita .env con tus valores (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET...)
npm install
```

## 3. Crear el usuario admin inicial

```bash
npm run seed:admin
```

Usa `ADMIN_EMAIL` / `ADMIN_PASSWORD` (definidos en `.env`) para iniciar sesión
en `admin.html`. Cambia la contraseña o borra el usuario después.

## 4. Levantar el servidor

```bash
npm run dev   # o: npm start
```

El servidor:
- Sirve la API en `/api/*` (mismas rutas que antes, sin `.php`:
  `/api/usuario`, `/api/login`, `/api/logout`, `/api/registro`,
  `/api/disponibilidad`, `/api/reservar`, `/api/reservas`, `/api/admin`).
- Sirve el sitio estático de `../elsotano` en `/` (equivalente a lo que hacía
  Apache/XAMPP), así que basta con abrir `http://localhost:3000`.

## Notas sobre la migración

- **Sesiones**: PHP usaba `$_SESSION` con cookies de sesión de servidor. Node
  usa un JWT firmado (`JWT_SECRET`) guardado en una cookie `httpOnly`
  llamada `session`, con el mismo rol (`cliente`/`admin`) y comportamiento.
- **Contraseñas**: `password_hash`/`password_verify` de PHP (bcrypt) se
  reemplazan por `bcryptjs` (mismo algoritmo, hashes existentes de MySQL
  serían compatibles si migras los datos).
- **Base de datos**: MySQL/PDO se reemplaza por Supabase (`@supabase/supabase-js`
  con la service role key). El esquema (`supabase/schema.sql`) es el
  equivalente en Postgres de `database.sql`.
