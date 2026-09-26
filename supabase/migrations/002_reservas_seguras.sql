-- Ejecutar una vez en el SQL Editor de Supabase (proyectos creados antes de
-- este cambio). Los proyectos nuevos ya lo reciben desde schema.sql.

-- Las reservas ya no requieren cuenta: el cliente las consulta o cancela con
-- un enlace secreto que le llega por correo (aquí solo guardamos su hash).
alter table reservaciones add column if not exists token_hash varchar(64);
create unique index if not exists idx_reservaciones_token on reservaciones (token_hash);

-- Crea la reserva solo si el horario sigue libre. El candado por fecha hace
-- que dos solicitudes simultáneas se atiendan una tras otra, así que nunca
-- pueden quedar dos reservas encimadas del mismo servicio.
create or replace function reservar_si_libre(
  p_usuario_id bigint,
  p_servicio text,
  p_fecha date,
  p_hora_inicio time,
  p_hora_fin time,
  p_duracion int,
  p_nombre text,
  p_telefono text,
  p_email text,
  p_mensaje text,
  p_token_hash text
) returns bigint
language plpgsql
as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('reservaciones:' || p_fecha::text));

  if exists (
    select 1 from reservaciones
    where fecha = p_fecha
      and estado <> 'cancelada'
      and servicio in (p_servicio, 'bloqueo')
      and hora_inicio < p_hora_fin
      and hora_fin > p_hora_inicio
  ) then
    return null;
  end if;

  insert into reservaciones (
    usuario_id, servicio, fecha, hora_inicio, hora_fin, duracion_horas,
    nombre, telefono, email, mensaje, estado, token_hash
  ) values (
    p_usuario_id, p_servicio, p_fecha, p_hora_inicio, p_hora_fin, p_duracion,
    p_nombre, p_telefono, p_email, p_mensaje, 'pendiente', p_token_hash
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Solo el backend (service role) puede llamarla.
revoke execute on function reservar_si_libre(bigint, text, date, time, time, int, text, text, text, text, text)
  from public, anon, authenticated;

-- Una reserva nunca puede terminar antes de empezar.
alter table reservaciones drop constraint if exists reservaciones_horario_valido;
alter table reservaciones add constraint reservaciones_horario_valido
  check (hora_fin > hora_inicio) not valid;
