document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const btnSubmit = document.getElementById("btn-submit");
  const formMessage = document.getElementById("form-message");

  // --- Dark Mode ---
  const themeToggle = document.getElementById("theme-toggle");
  const iconSun = document.getElementById("icon-sun");
  const iconMoon = document.getElementById("icon-moon");

  function applyTheme(dark) {
    document.body.classList.toggle("dark-mode", dark);
    iconSun.style.display = dark ? "none" : "block";
    iconMoon.style.display = dark ? "block" : "none";
  }

  // Cargar preferencia guardada
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme === "dark" || (!savedTheme && prefersDark));

  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    iconSun.style.display = isDark ? "none" : "block";
    iconMoon.style.display = isDark ? "block" : "none";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  // --- Formulario contacto (solo en index.html) ---
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
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => link.classList.remove("active"));
          const activeLink = document.querySelector(
            `.nav-bg a[href="#${entry.target.id}"]`
          );
          if (activeLink) activeLink.classList.add("active");
        }
      });
    }, { threshold: 0.3 });

    sections.forEach((section) => observer.observe(section));
  }
});
