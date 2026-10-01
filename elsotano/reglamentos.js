// Reglamentos de los espacios. Se muestran en reglamentos.html y al reservar.
window.REGLAMENTOS = {
  "sala-ensayo": {
    titulo: "Sala de ensayo",
    reglas: [
      ["Mantener limpio el espacio", "Si llevas bebidas, se tendrán que disponer los desechos en la basura."],
      ["No meter comida", "Por el bien de la sala de ensayo, se tendrá que evitar el consumo de alimentos dentro del cuarto."],
      ["Cuidar el espacio", "Para poder seguir ofreciendo nuestros servicios, El Sótano te agradece que cuides el espacio y el mobiliario."],
      ["Hacer uso adecuado del equipo", "En caso de necesitar ayuda para utilizar el equipo, puedes acercarte con la persona auxiliar."],
    ],
  },
  fotografia: {
    titulo: "Estudio de fotografía",
    reglas: [
      ["Mantener limpio el espacio", "Si llevas comida, bebidas o cualquier producto desechable, se tendrá que disponer en la basura."],
      ["Hacer uso adecuado del equipo", "En caso de necesitar ayuda para utilizar el equipo, puedes acercarte con la persona auxiliar de fotografía."],
      ["Cuidar el espacio", "Para poder seguir ofreciendo nuestros servicios, El Sótano te agradece que cuides el espacio y el mobiliario."],
      ["Mantener con vida al ciclorama", "Es importante alargar la vida del ciclorama lo mejor posible para que tus fotografías no se vean sucias en el proceso. En tu cobertura te haremos entrega de un trapo con agua para limpiar la suela de los zapatos."],
    ],
  },
};

window.listaReglamento = function (id) {
  const r = window.REGLAMENTOS[id];
  if (!r) return "";
  return (
    '<ol class="reglas">' +
    r.reglas
      .map(
        ([t, d], i) =>
          `<li><span class="regla-num">[${i + 1}]</span> <strong>${t}</strong>: <span class="regla-desc">${d}</span></li>`,
      )
      .join("") +
    "</ol>"
  );
};
