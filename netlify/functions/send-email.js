const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Sanitiza entradas removiendo tags HTML y espacios extra
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

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

  try {
    const { nombre, email, telefono, mensaje } = JSON.parse(event.body);

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

    // Sanitizar todos los campos
    const limpio = {
      nombre: sanitize(nombre),
      email: sanitize(email),
      telefono: sanitize(telefono || "No proporcionado"),
      mensaje: sanitize(mensaje),
    };

    const destinatario = process.env.CONTACT_EMAIL;

    const { data, error } = await resend.emails.send({
      from: "Portfolio Web <onboarding@resend.dev>",
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
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};
