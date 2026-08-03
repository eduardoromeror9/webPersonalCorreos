// Función para enviar el formulario de contacto por email

const { Resend } = require("resend");
const { createRateLimiter, getClientIp, buildHeaders } = require("./_shared/http");

const resend = new Resend(process.env.RESEND_API_KEY);

// --- Rate limiting simple (en memoria, por instancia) ---
// Suficiente para disuadir bots y abusos en un sitio estático. Cada
// instancia mantiene su propio contador; no es distribuido, pero sí
// efectivo para bloquear ráfagas. Usar el rate limiting nativo de
// Netlify (config en el objeto `config`) para algo más estricto.
const isRateLimited = createRateLimiter(5);

// --- Sanitización ---
// Escapa entidades HTML y elimina CR/LF (evita XSS en el correo y
// email header injection). Después de escapar, los saltos de línea se
// convierten en <br> para mantener la legibilidad del mensaje.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.replace(/\r\n?/g, "\n").trim();
}

const LIMITS = {
  nombre: 100,
  email: 100,
  telefono: 30,
  mensaje: 5000,
};

exports.handler = async (event) => {
  const headers = buildHeaders(event);

  // Preflight OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  // Rate limit por IP
  const clientIp = getClientIp(event);
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: { ...headers, "Retry-After": "60" },
      body: JSON.stringify({ error: "Demasiadas solicitudes. Intenta en un minuto." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "JSON inválido" }),
    };
  }

  const { nombre, email, telefono, mensaje } = body;

  // Honeypot: si un bot rellena el campo oculto, descartamos la petición
  if (body.honeypot) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Correo enviado correctamente" }),
    };
  }

  // Validar campos requeridos
  if (!nombre || !email || !mensaje) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Nombre, correo y mensaje son obligatorios" }),
    };
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "El formato del correo no es válido" }),
    };
  }

  // Validar tipos y longitudes máximas
  if (typeof nombre !== "string" || typeof email !== "string" || typeof mensaje !== "string") {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Campos inválidos" }),
    };
  }

  if (
    nombre.length > LIMITS.nombre ||
    email.length > LIMITS.email ||
    (telefono !== undefined && typeof telefono !== "string") ||
    (telefono && telefono.length > LIMITS.telefono) ||
    mensaje.length > LIMITS.mensaje
  ) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Algún campo excede el largo permitido" }),
    };
  }

  // Sanitizar y escapar todos los campos
  const limpio = {
    nombre: escapeHtml(sanitize(nombre)),
    email: escapeHtml(sanitize(email)),
    telefono: escapeHtml(sanitize(telefono || "No proporcionado")),
    mensaje: escapeHtml(sanitize(mensaje)).replace(/\n/g, "<br>"),
  };

  const destinatario = process.env.CONTACT_EMAIL;
  const remitente = process.env.RESEND_FROM || "Portfolio Web <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from: remitente,
    to: destinatario,
    subject: `Nuevo mensaje de contacto: ${limpio.nombre}`,
    html: `
      <h2>Nuevo mensaje desde tu portfolio web</h2>
      <p><strong>Nombre:</strong> ${limpio.nombre}</p>
      <p><strong>Email:</strong> ${limpio.email}</p>
      <p><strong>Teléfono:</strong> ${limpio.telefono}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${limpio.mensaje}</p>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error al enviar el correo" }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: "Correo enviado correctamente", id: data?.id }),
  };
};
