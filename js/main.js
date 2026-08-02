document.addEventListener("DOMContentLoaded", () => {
  // --- Efecto máquina de escribir ---
  const typewriter = document.getElementById("typewriter");
  if (typewriter) {
    const text = typewriter.dataset.text || "Eduardo Romero";
    let index = 0;

    function typeWriter() {
      if (index < text.length) {
        typewriter.innerHTML += text.charAt(index);
        index++;
        setTimeout(typeWriter, 180);
      }
    }

    typeWriter();
  }

  // --- Scroll suave ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // --- Formulario contacto (solo en index.html) ---
  const form = document.getElementById("contact-form");
  const btnSubmit = document.getElementById("btn-submit");
  const formMessage = document.getElementById("form-message");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      btnSubmit.disabled = true;
      btnSubmit.value = "Enviando...";
      formMessage.textContent = "";
      formMessage.className = "form-message";

      const formData = {
        nombre: form.nombre.value,
        email: form.email.value,
        telefono: form.telefono.value,
        mensaje: form.mensaje.value,
        honeypot: form.honeypot ? form.honeypot.value : "",
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
  }

  // --- Menú activo con Intersection Observer ---
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".navegacion-principal a");

  if (sections.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => link.classList.remove("active"));
            const activeLink = document.querySelector(
              `.nav-bg a[href="#${entry.target.id}"]`
            );
            if (activeLink) activeLink.classList.add("active");
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  // --- Animación de entrada al hacer scroll ---
  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  document
    .querySelectorAll(".comparison-card, .servicio, .testimonio-card, .experiencia-card, .certificacion-card")
    .forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "all 0.6s ease-out";
      observer.observe(el);
    });
});
