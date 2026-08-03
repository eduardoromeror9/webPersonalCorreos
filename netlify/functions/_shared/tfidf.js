// Lógica de matching semántico TF-IDF del chatbot.

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

function createMatcher(knowledge) {
  const index = knowledge.map(entry => {
    const allText = entry.preguntas.join(' ') + ' ' + entry.respuesta;
    return { id: entry.id, tokens: tokenize(allText) };
  });

  const termDocCount = {};
  index.forEach(doc => {
    const unique = new Set(doc.tokens);
    unique.forEach(t => { termDocCount[t] = (termDocCount[t] || 0) + 1; });
  });

  const N = index.length;
  const idf = {};
  for (const t in termDocCount) {
    idf[t] = Math.log((N + 1) / (termDocCount[t] + 1)) + 1;
  }

  const docVectors = index.map(doc => {
    const tf = termFrequency(doc.tokens);
    const vec = {};
    for (const t in tf) {
      if (idf[t]) vec[t] = tf[t] * idf[t];
    }
    return { id: doc.id, vec };
  });

  return function findBestMatch(question) {
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
  };
}

module.exports = {
  tokenize,
  termFrequency,
  cosineSimilarity,
  normalizeText,
  createMatcher,
};
