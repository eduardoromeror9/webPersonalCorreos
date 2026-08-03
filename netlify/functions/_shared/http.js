// Helpers HTTP compartidos por las funciones serverless de Netlify.

// Orígenes permitidos. El frontend llama desde el mismo dominio; estos
// valores solo importan para peticiones cross-origin.
const ALLOWED_ORIGINS = new Set([
  "https://webeduardor9.netlify.app",
  "http://localhost:8888",
  "http://localhost:3000",
]);

// --- Rate limiting simple (en memoria, por instancia) ---
const WINDOW_MS = 60 * 1000;
const hitMap = new Map(); // ip -> { count, windowStart }

function createRateLimiter(maxRequests) {
  return function isRateLimited(ip) {
    const now = Date.now();
    const entry = hitMap.get(ip);
    if (!entry || now - entry.windowStart >= WINDOW_MS) {
      hitMap.set(ip, { count: 1, windowStart: now });
      return false;
    }
    entry.count += 1;
    return entry.count > maxRequests;
  };
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

module.exports = {
  createRateLimiter,
  getClientIp,
  buildHeaders,
};
