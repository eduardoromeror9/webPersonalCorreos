(function () {
  const CHAT_URL = '/.netlify/functions/chatbot';

  const WELCOME_MESSAGE =
    '¡Hola! Soy el asistente virtual de Eduardo. Puedes preguntarme sobre mi experiencia, proyectos, habilidades y más. ¿En qué puedo ayudarte?';

  const state = {
    open: false,
    waiting: false,
  };

  // Netlify Image CDN: sirve AVIF/WebP con fallback al PNG original.
  // Requiere activar "Netlify Image CDN" en el dashboard de Netlify;
  // si está desactivado, las URLs con query params devuelven el PNG.
  const CHAT_ICON = {
    fallback: 'img/chatBotIcon.png',
    webp: 'img/chatBotIcon.png?format=webp',
    avif: 'img/chatBotIcon.png?format=avif',
  };

  function iconPicture() {
    return (
      '<picture>' +
      `<source srcset="${CHAT_ICON.avif}" type="image/avif">` +
      `<source srcset="${CHAT_ICON.webp}" type="image/webp">` +
      `<img src="${CHAT_ICON.fallback}" alt="" loading="lazy">` +
      '</picture>'
    );
  }

  function createChatHTML() {
    const container = document.createElement('div');
    container.id = 'chatbot-container';
    container.className = 'chatbot-container';
    container.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-header-title">
          ${iconPicture()}
          Eduardo IA
        </div>
        <button id="chatbot-close" class="chatbot-header-close" aria-label="Cerrar chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="chatbot-messages" class="chatbot-messages" role="log" aria-live="polite"></div>
      <div class="chatbot-input-area">
        <input id="chatbot-input" class="chatbot-input" type="text" placeholder="Escribe tu pregunta..." autocomplete="off">
        <button id="chatbot-send" class="chatbot-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    `;
    return container;
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.id = 'chatbot-btn';
    btn.className = 'chatbot-btn';
    btn.setAttribute('aria-label', 'Abrir chat');
    btn.setAttribute('aria-controls', 'chatbot-container');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = iconPicture();
    return btn;
  }

  function addMessage(text, type) {
    const messages = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.className = 'chatbot-message ' + type;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const messages = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.id = 'chatbot-typing';
    div.className = 'chatbot-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('chatbot-typing');
    if (el) el.remove();
  }

  function loadHistory() {
    const saved = sessionStorage.getItem('chatbot_history');
    let messages = [];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error('formato inválido');
        messages = parsed;
      } catch (e) {
        // Historial corrupto: se limpia y se arranca de cero.
        sessionStorage.removeItem('chatbot_history');
      }
    }

    const container = document.getElementById('chatbot-messages');

    if (messages.length === 0) {
      addMessage(WELCOME_MESSAGE, 'bot');
      saveHistory();
      return;
    }

    container.innerHTML = '';
    messages.forEach((m) => addMessage(m.text, m.type));
  }

  function saveHistory() {
    const container = document.getElementById('chatbot-messages');
    const messages = [];
    container.querySelectorAll('.chatbot-message').forEach(el => {
      const type = el.classList.contains('user') ? 'user' : 'bot';
      messages.push({ text: el.textContent, type });
    });
    sessionStorage.setItem('chatbot_history', JSON.stringify(messages));
  }

  async function sendMessage(text) {
    if (state.waiting) return;

    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');

    addMessage(text, 'user');
    saveHistory();

    state.waiting = true;
    input.disabled = true;
    sendBtn.disabled = true;
    input.value = '';
    showTyping();

    // Timeout: si la función tarda más de 15s, aborta y habilita el chat de nuevo.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (res.ok && data.answer) {
        addMessage(data.answer, 'bot');
      } else {
        addMessage('Lo siento, ocurrió un error. Intenta de nuevo.', 'bot error');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        addMessage('El servicio tardó demasiado. Intenta de nuevo.', 'bot error');
      } else {
        addMessage('Error de conexión. Verifica tu internet.', 'bot error');
      }
    } finally {
      clearTimeout(timer);
      hideTyping();
      state.waiting = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
      saveHistory();
    }
  }

  function init() {
    if (document.getElementById('chatbot-btn')) return;

    const btn = createButton();
    const container = createChatHTML();
    document.body.appendChild(btn);
    document.body.appendChild(container);

    loadHistory();

    function focusTrap(e) {
      if (e.key !== 'Tab') return;
      const focusables = container.querySelectorAll(
        'button, input, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function openChat() {
      state.open = true;
      container.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      const input = document.getElementById('chatbot-input');
      setTimeout(() => input.focus(), 300);
      document.addEventListener('keydown', focusTrap);
    }

    function closeChat() {
      state.open = false;
      container.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', focusTrap);
      btn.focus();
    }

    btn.addEventListener('click', () => {
      if (state.open) {
        closeChat();
      } else {
        openChat();
      }
    });

    document.getElementById('chatbot-close').addEventListener('click', closeChat);

    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');

    function handleSend() {
      const text = input.value.trim();
      if (text && !state.waiting) {
        sendMessage(text);
      }
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
