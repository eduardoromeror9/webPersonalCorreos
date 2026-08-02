const path = require('path');
const fs = require('fs');

const knowledgePath = path.resolve(__dirname, '..', '..', 'knowledge.json');
let knowledge;

try {
  const raw = fs.readFileSync(knowledgePath, 'utf-8');
  knowledge = JSON.parse(raw);
} catch (err) {
  console.error('Failed to load knowledge.json:', err.message);
  knowledge = [];
}

// Orígenes permitidos. El frontend llama desde el mismo dominio; estos
// valores solo importan para peticiones cross-origin.
const ALLOWED_ORIGINS = new Set([
  "https://webeduardor9.netlify.app",
  "http://localhost:8888",
  "http://localhost:3000",
]);

// --- Rate limiting simple (en memoria, por instancia) ---
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;
const hitMap = new Map(); // ip -> { count, windowStart }

function isRateLimited(ip) {
  const now = Date.now();
  const entry = hitMap.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

function getClientIp(event) {
  return (
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// --- CORS ---
function buildHeaders(event) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const origin = event.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

function tokenize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function termFrequency(tokens) {
  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq), 1);
  for (const t in freq) freq[t] /= maxFreq;
  return freq;
}

let index, idf, docVectors;

function buildIndex() {
  if (index) return;

  index = knowledge.map(entry => {
    const allText = entry.preguntas.join(' ') + ' ' + entry.respuesta;
    return { id: entry.id, tokens: tokenize(allText) };
  });

  const termDocCount = {};
  index.forEach(doc => {
    const unique = new Set(doc.tokens);
    unique.forEach(t => { termDocCount[t] = (termDocCount[t] || 0) + 1; });
  });

  const N = index.length;
  idf = {};
  for (const t in termDocCount) {
    idf[t] = Math.log((N + 1) / (termDocCount[t] + 1)) + 1;
  }

  docVectors = index.map(doc => {
    const tf = termFrequency(doc.tokens);
    const vec = {};
    for (const t in tf) {
      if (idf[t]) vec[t] = tf[t] * idf[t];
    }
    return { id: doc.id, vec };
  });
}

function cosineSimilarity(vec1, vec2) {
  let dot = 0, mag1 = 0, mag2 = 0;
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  for (const k of keys) {
    const v1 = vec1[k] || 0;
    const v2 = vec2[k] || 0;
    dot += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }
  const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
  return denom === 0 ? 0 : dot / denom;
}

function normalizeText(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,;:()]/g, '').trim();
}

function findBestMatch(question) {
  buildIndex();

  const normalized = normalizeText(question);

  for (const entry of knowledge) {
    for (const p of entry.preguntas) {
      if (normalizeText(p) === normalized) {
        return { bestId: entry.id, bestScore: 1 };
      }
    }
  }

  const queryTokens = tokenize(question);
  const queryTf = termFrequency(queryTokens);
  const queryVec = {};
  for (const t in queryTf) {
    if (idf[t]) queryVec[t] = queryTf[t] * idf[t];
  }

  let bestScore = 0;
  let bestId = null;

  for (const doc of docVectors) {
    const score = cosineSimilarity(queryVec, doc.vec);
    if (score > bestScore) {
      bestScore = score;
      bestId = doc.id;
    }
  }

  return { bestId, bestScore };
}

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

  try {
    const { question } = JSON.parse(event.body);

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
