(function () {
  const CHAT_URL = '/.netlify/functions/chatbot';

  const state = {
    open: false,
    waiting: false,
  };

  function createChatHTML() {
    const container = document.createElement('div');
    container.id = 'chatbot-container';
    container.className = 'chatbot-container';
    container.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-header-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Eduardo IA
        </div>
        <button id="chatbot-close" class="chatbot-header-close" aria-label="Cerrar chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="chatbot-messages" class="chatbot-messages"></div>
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
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
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

  function getWelcomeMessage() {
    const saved = sessionStorage.getItem('chatbot_history');
    if (!saved || JSON.parse(saved).length === 0) {
      return '¡Hola! Soy el asistente virtual de Eduardo. Puedes preguntarme sobre su experiencia, proyectos, habilidades y más. ¿En qué puedo ayudarte?';
    }
    return null;
  }

  function loadHistory() {
    const saved = sessionStorage.getItem('chatbot_history');
    if (!saved) return;
    try {
      const messages = JSON.parse(saved);
      const container = document.getElementById('chatbot-messages');
      container.innerHTML = '';
      messages.forEach(m => addMessage(m.text, m.type));
    } catch (e) {
      sessionStorage.removeItem('chatbot_history');
    }
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

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();

      hideTyping();

      if (res.ok && data.answer) {
        addMessage(data.answer, 'bot');
      } else {
        addMessage('Lo siento, ocurrió un error. Intenta de nuevo.', 'bot error');
      }
    } catch (err) {
      hideTyping();
      addMessage('Error de conexión. Verifica tu internet.', 'bot error');
    }

    state.waiting = false;
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
    saveHistory();
  }

  function init() {
    if (document.getElementById('chatbot-btn')) return;

    const btn = createButton();
    const container = createChatHTML();
    document.body.appendChild(btn);
    document.body.appendChild(container);

    const messages = document.getElementById('chatbot-messages');
    const welcome = getWelcomeMessage();
    if (welcome) {
      addMessage(welcome, 'bot');
      saveHistory();
    } else {
      loadHistory();
    }

    btn.addEventListener('click', () => {
      state.open = !state.open;
      container.classList.toggle('open', state.open);
      if (state.open) {
        const input = document.getElementById('chatbot-input');
        setTimeout(() => input.focus(), 300);
      }
    });

    document.getElementById('chatbot-close').addEventListener('click', () => {
      state.open = false;
      container.classList.remove('open');
    });

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
