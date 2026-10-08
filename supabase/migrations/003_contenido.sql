-- Ejecutar una vez en el SQL Editor de Supabase.
-- Contenido que el staff edita desde el panel (/admin/contenido): precios,
-- horarios y, más adelante, textos y fotos. Una fila por sección; si una
-- fila no existe, el sitio usa los valores de siempre.
create table if not exists contenido (
  clave text primary key,
  valor jsonb not null,
  actualizado_en timestamptz not null default now()
);

-- Igual que las demás tablas: solo el backend (service role) la lee y escribe.
alter table contenido enable row level security;
