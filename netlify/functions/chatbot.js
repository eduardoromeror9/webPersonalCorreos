const path = require('path');
const fs = require('fs');
const { createRateLimiter, getClientIp, buildHeaders } = require('./_shared/http');
const { createMatcher } = require('./_shared/tfidf');

const knowledgePath = path.resolve(__dirname, '_data', 'knowledge.json');
let knowledge;

try {
  const raw = fs.readFileSync(knowledgePath, 'utf-8');
  knowledge = JSON.parse(raw);
} catch (err) {
  console.error('Failed to load knowledge.json:', err.message);
  knowledge = [];
}

const findBestMatch = createMatcher(knowledge);

// --- Rate limiting simple (en memoria, por instancia) ---
const isRateLimited = createRateLimiter(30);

exports.handler = async (event) => {
  const headers = buildHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  }

  // Rate limit por IP
  const clientIp = getClientIp(event);
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: { ...headers, "Retry-After": "60" },
      body: JSON.stringify({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'JSON inválido' }),
    };
  }

  try {
    const { question } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Pregunta inválida' }),
      };
    }

    if (question.length > 500) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Pregunta demasiado larga' }),
      };
    }

    const { bestId, bestScore } = findBestMatch(question.trim());

    const THRESHOLD = 0.2;
    let answer;

    if (bestId && bestScore >= THRESHOLD) {
      const entry = knowledge.find(e => e.id === bestId);
      answer = entry.respuesta;
    } else {
      answer = 'No estoy capacitado para responder sobre ese tema.';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer }),
    };
  } catch (err) {
    console.error('Chatbot error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};
