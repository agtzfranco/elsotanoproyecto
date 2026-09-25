-- Esquema de base de datos para Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase (reemplaza a database.sql / MySQL)

create type rol_usuario as enum ('cliente', 'admin');
create type estado_reserva as enum ('pendiente', 'confirmada', 'cancelada');

create table if not exists usuarios (
  id bigint generated always as identity primary key,
  nombre varchar(100) not null,
  email varchar(150) not null unique,
  telefono varchar(30) not null default '',
  password_hash varchar(255) not null,
  rol rol_usuario not null default 'cliente',
  creado_en timestamptz not null default now()
);

create table if not exists reservaciones (
  id bigint generated always as identity primary key,
  usuario_id bigint references usuarios(id) on delete set null,
  servicio varchar(50) not null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  duracion_horas int not null default 1,
  nombre varchar(150) not null,
  telefono varchar(30) not null default '',
  email varchar(150) not null default '',
  mensaje text,
  estado estado_reserva not null default 'pendiente',
  creado_en timestamptz not null default now()
);

create index if not exists idx_reservaciones_fecha on reservaciones (fecha);

-- El backend Node accede con la Service Role Key (bypasea RLS), así que
-- habilitamos RLS sin políticas públicas: ningún cliente anónimo/autenticado
-- de Supabase puede leer o escribir estas tablas directamente.
alter table usuarios enable row level security;
alter table reservaciones enable row level security;
