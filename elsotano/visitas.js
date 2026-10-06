// Contador de visitas (GoatCounter): gratis, sin cookies y sin guardar datos
// personales, así que no necesita aviso de cookies. Solo se carga en las
// páginas públicas; el panel, el login y "mis reservas" no se cuentan.
// Si algún día cambia el código de la cuenta, solo se cambia aquí.
(function () {
  var CUENTA = "elsotanomx";
  // Las pruebas en la computadora no cuentan como visitas.
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://" + CUENTA + ".goatcounter.com/count");
  document.head.appendChild(s);
})();
