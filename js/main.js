document.addEventListener("DOMContentLoaded", () => {
  // --- Efecto máquina de escribir ---
  const typewriter = document.getElementById("typewriter");
  if (typewriter) {
    const text = typewriter.dataset.text || "Eduardo Romero";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      typewriter.textContent = text;
    } else {
      let index = 0;

      function typeWriter() {
        if (index < text.length) {
          typewriter.textContent += text.charAt(index);
          index++;
          setTimeout(typeWriter, 180);
        }
      }

      typeWriter();
    }
  }

  // --- Menú hamburguesa (móvil) ---
  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("navegacion");

  function closeNavMenu() {
    if (!navToggle || !navMenu) return;
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menú");
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNavMenu);
    });

    document.addEventListener("click", (e) => {
      if (navMenu.classList.contains("open") && !e.target.closest(".nav-bg")) {
        closeNavMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNavMenu();
    });
  }

  // --- Scroll suave ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const href = this.getAttribute("href");

      // El contacto ya no es una sección: abre el modal
      if (href === "#contacto") {
        openModal();
        return;
      }

      const target = document.querySelector(href);
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

  // --- Modal de contacto ---
  const modal = document.getElementById("contacto");
  const modalClose = document.getElementById("modal-close");

  let lastFocused = null;

  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add("open");
    document.body.style.overflow = "hidden"; // bloquea el scroll de fondo
    const firstField = modal.querySelector("input, textarea, button");
    if (firstField) firstField.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    if (window.location.hash === "#contacto") {
      try {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch (e) { /* noop */ }
    }
  }

  if (modal) {
    if (modalClose) modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
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

  // Abrir el modal si se llegó con el hash #contacto (desde sobre-mi.html, 404, etc.)
  if (window.location.hash === "#contacto") {
    openModal();
  }
});
