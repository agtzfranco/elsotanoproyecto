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
    excedido(req) {
      return vigentes(req.ip, Date.now()).length >= maximo;
    },
    registrar(req) {
      const ahora = Date.now();
      registros.set(req.ip, [...vigentes(req.ip, ahora), ahora]);
      if (registros.size > 5000) {
        for (const ip of registros.keys()) vigentes(ip, ahora);
      }
    },
  };
}
