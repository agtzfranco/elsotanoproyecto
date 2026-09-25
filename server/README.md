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

## 5. Desplegar (producción)

El servidor sirve frontend + API desde un solo proceso, así que no necesitas
GitHub Pages ni configurar CORS entre dominios distintos — basta con un host
que corra Node.js.

### Opción recomendada: Render

El repo incluye `../render.yaml` (Blueprint). Pasos:

1. En https://dashboard.render.com pulsa **New → Blueprint** y conecta este
   repositorio (branch `main`).
2. Render detecta `render.yaml` y crea un Web Service con:
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`
3. Te pedirá los valores de `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
   (los mismos del paso 1). `JWT_SECRET` se genera automáticamente.
4. Tras el primer deploy exitoso, corre el seed del admin una vez desde la
   **Shell** del servicio en Render (o localmente apuntando a la misma
   Supabase): `npm run seed:admin`.
5. Abre la URL que te da Render (`https://elsotano-xxxx.onrender.com`) — ya
   sirve todo el sitio (`index.html`, `login.html`, reservas, admin) y la API.

### Otras opciones

Cualquier host que corra Node.js sirve igual: Railway, Fly.io, un VPS, etc.
Solo necesitas configurar las mismas variables de `.env.example` y correr
`npm install && npm start` dentro de `server/`.

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
