// Envío de correos con Resend (https://resend.com). Si faltan las variables
// RESEND_API_KEY / CORREO_REMITENTE, los avisos simplemente no se envían.
import { NOMBRES_SERVICIO } from "./reglas.js";

export function correoConfigurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.CORREO_REMITENTE);
}

export function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Nunca lanza error: un correo fallido no debe romper la reserva.
export async function enviarCorreo({ para, asunto, html }) {
  if (!correoConfigurado() || !para) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CORREO_REMITENTE,
        to: [para],
        subject: asunto,
        html,
      }),
    });
    if (!res.ok) {
      console.error("No se pudo enviar el correo:", res.status, await res.text());
    }
    return res.ok;
  } catch (err) {
    console.error("No se pudo enviar el correo:", err.message);
    return false;
  }
}

function fechaCorta(iso) {
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}

function detalleReserva(r) {
  const filas = [
    ["Servicio", NOMBRES_SERVICIO[r.servicio] || r.servicio],
    ["Fecha", fechaCorta(r.fecha)],
    ["Horario", `${String(r.hora_inicio).slice(0, 5)} – ${String(r.hora_fin).slice(0, 5)}`],
  ];
  if (r.nombre) filas.push(["Cliente", r.nombre]);
  if (r.telefono) filas.push(["Teléfono", r.telefono]);
  if (r.email) filas.push(["Correo", r.email]);
  if (r.mensaje) filas.push(["Notas", r.mensaje]);
  return `<table cellpadding="6" style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif">${filas
    .map(
      ([k, v]) =>
        `<tr><td style="color:#666">${escaparHtml(k)}</td><td><strong>${escaparHtml(v)}</strong></td></tr>`,
    )
    .join("")}</table>`;
}

function plantilla(titulo, cuerpo) {
  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#111;max-width:560px">
<h2 style="margin:0 0 16px">${escaparHtml(titulo)}</h2>${cuerpo}
<p style="color:#666;font-size:13px;margin-top:24px">El Sótano</p></div>`;
}

// Avisos de reservas. Se llaman sin await para no frenar la respuesta.
export const avisos = {
  reservaNueva(r, enlace) {
    enviarCorreo({
      para: process.env.CORREO_STAFF,
      asunto: `Nueva reserva: ${NOMBRES_SERVICIO[r.servicio] || r.servicio} ${fechaCorta(r.fecha)}`,
      html: plantilla("Nueva reserva", `${detalleReserva(r)}<p>Ya quedó confirmada. Si necesitas cancelarla, hazlo desde el panel administrativo.</p>`),
    });
    this.confirmacionCliente(r, enlace);
  },
  // Reserva hecha a mano por el staff: el staff ya la conoce, así que solo se
  // avisa al cliente, y solo si dejó correo.
  reservaManual(r, enlace) {
    this.confirmacionCliente(r, enlace);
  },
  confirmacionCliente(r, enlace) {
    enviarCorreo({
      para: r.email,
      asunto: "Tu reserva en El Sótano está confirmada",
      html: plantilla(
        `Hola, ${r.nombre}`,
        `<p>Tu reserva quedó confirmada. Te esperamos.</p>${detalleReserva({ ...r, nombre: "", telefono: "", email: "" })}
<p><a href="${escaparHtml(enlace)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none">Ver o cancelar mi reserva</a></p>
<p style="color:#666;font-size:13px">Guarda este correo: el enlace es la única forma de consultar o cancelar tu reserva en línea.</p>`,
      ),
    });
  },
  reservaConfirmada(r) {
    enviarCorreo({
      para: r.email,
      asunto: "Tu reserva en El Sótano está confirmada",
      html: plantilla(`¡Listo, ${r.nombre}!`, `<p>Tu reserva quedó confirmada. Te esperamos.</p>${detalleReserva({ ...r, nombre: "", telefono: "", email: "", mensaje: "" })}`),
    });
  },
  reservaCanceladaPorStaff(r) {
    enviarCorreo({
      para: r.email,
      asunto: "Tu reserva en El Sótano fue cancelada",
      html: plantilla(`Hola, ${r.nombre}`, `<p>El staff canceló esta reserva. Si tienes dudas, contáctanos para reprogramarla.</p>${detalleReserva({ ...r, nombre: "", telefono: "", email: "", mensaje: "" })}`),
    });
  },
  reservaMovida(r) {
    enviarCorreo({
      para: r.email,
      asunto: "Cambió el horario de tu reserva en El Sótano",
      html: plantilla(`Hola, ${r.nombre}`, `<p>Tu reserva cambió de fecha u hora. Este es el nuevo horario:</p>${detalleReserva({ ...r, nombre: "", telefono: "", email: "", mensaje: "" })}<p>El enlace de tu primer correo sigue sirviendo para ver o cancelar tu reserva.</p>`),
    });
  },
  reservaCanceladaPorCliente(r) {
    enviarCorreo({
      para: process.env.CORREO_STAFF,
      asunto: `Reserva cancelada por el cliente: ${fechaCorta(r.fecha)}`,
      html: plantilla("Un cliente canceló su reserva", detalleReserva(r)),
    });
  },
};
