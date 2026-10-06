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

### Si tu base de Supabase ya existía

Ejecuta también `../supabase/migrations/002_reservas_seguras.sql` en el SQL
Editor (una sola vez). Agrega el enlace secreto de cada reserva y la función
`reservar_si_libre`, que impide que dos personas reserven el mismo horario al
mismo tiempo. Sin ella el servidor no puede registrar reservas.

## 2. Configurar el servidor

```bash
cd server
cp .env.example .env
# edita .env con tus valores (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET...)
npm install
```

### Correos (opcional pero recomendado)

1. Crea una cuenta gratis en https://resend.com y verifica el dominio del
   estudio (o usa `onboarding@resend.dev` para pruebas).
2. Define `RESEND_API_KEY`, `CORREO_REMITENTE` y `CORREO_STAFF`.

Con eso se envían estos avisos:
- Al staff: cada reserva nueva y cada cancelación hecha por el cliente.
- Al cliente: la reserva recibida (con el enlace para verla o cancelarla),
  la confirmación y la cancelación hecha por el staff.

## Cómo funcionan las reservas

- Los clientes reservan sin cuenta, solo con nombre, correo y teléfono.
- Cada reserva recibe un enlace secreto (`/mis-reservas?token=...`) que
  llega por correo y también se muestra al terminar de reservar. Con él se
  consulta o cancela la reserva mientras no haya empezado.
- Solo el staff inicia sesión (`/login`) para entrar a `/admin`.
- La renta de equipo se reserva por evento: ocupa desde la hora de inicio
  hasta el cierre (23:00).

## 3. Cuenta del staff (admin)

Pon `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 8 caracteres; opcional
`ADMIN_NOMBRE`) en las variables de entorno y reinicia el servidor. Al
arrancar, si ese correo no existe se crea como admin; si ya existe, se le pone
esa contraseña. Sirve también para recuperar el acceso: cambia
`ADMIN_PASSWORD` en Render y vuelve a desplegar. Luego entra en `/login`.

En local también puedes usar `npm run seed:admin` con los mismos valores en
`.env`.

## 4. Levantar el servidor

```bash
npm run dev   # o: npm start
```

El servidor:
- Sirve la API en `/api/*` (mismas rutas que antes, sin `.php`:
  `/api/usuario`, `/api/login`, `/api/logout`,
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

## Links limpios

Las páginas se abren sin `.html` (`/reservas`, `/login`, `/admin`). Los links
viejos con `.html` (por ejemplo, en correos ya enviados) se redirigen solos.

## Posts de Instagram

La sección "Síguenos en Instagram" de la portada está oculta hasta que se
configure un feed. Crea una cuenta gratis en https://behold.so, conecta
@elsotanomx, crea un feed tipo JSON y pega su URL en `data-feed` de
`<section id="instagram">` en `elsotano/index.html`.
