// Límite simple por IP (en memoria) para frenar abusos del formulario público.
// Solo cuenta lo que se registra con registrar(), p. ej. reservas exitosas,
// para que un cliente que se equivoca de horario no quede bloqueado.
export function crearLimite({ maximo, ventanaMs }) {
  const registros = new Map();

  function vigentes(ip, ahora) {
    const lista = (registros.get(ip) ?? []).filter((t) => ahora - t < ventanaMs);
    if (lista.length) registros.set(ip, lista);
    else registros.delete(ip);
    return lista;
  }

  return {
    // clave: por defecto la IP; se puede contar por otra cosa (p. ej. correo).
    excedido(req, clave = req.ip) {
      return vigentes(clave, Date.now()).length >= maximo;
    },
    registrar(req, clave = req.ip) {
      const ahora = Date.now();
      registros.set(clave, [...vigentes(clave, ahora), ahora]);
      if (registros.size > 5000) {
        for (const ip of registros.keys()) vigentes(ip, ahora);
      }
    },
  };
}
