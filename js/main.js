document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const btnSubmit = document.getElementById("btn-submit");
  const formMessage = document.getElementById("form-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Estado: enviando
    btnSubmit.disabled = true;
    btnSubmit.value = "Enviando...";
    formMessage.textContent = "";
    formMessage.className = "form-message";

    // Recoger datos del formulario
    const formData = {
      nombre: form.nombre.value,
      email: form.email.value,
      telefono: form.telefono.value,
      mensaje: form.mensaje.value,
    };

    try {
      const response = await fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        formMessage.textContent = "Mensaje enviado correctamente. ¡Gracias!";
        formMessage.classList.add("form-success");
        form.reset();
      } else {
        formMessage.textContent = data.error || "Error al enviar. Intenta de nuevo.";
        formMessage.classList.add("form-error");
      }
    } catch (err) {
      formMessage.textContent = "Error de conexión. Verifica tu internet.";
      formMessage.classList.add("form-error");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.value = "Enviar";
    }
  });
});
