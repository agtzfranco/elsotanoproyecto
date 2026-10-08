-- Opcional: el servidor crea este bucket solo la primera vez que se sube
-- una foto desde el panel. Ejecutarlo aquí lo deja listo de antemano.
-- Bucket público "fotos" para las fotos que sube el staff (solo WebP, 3 MB máx.).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 3145728, array['image/webp'])
on conflict (id) do nothing;
