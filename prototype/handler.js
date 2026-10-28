import { PrototypeError } from './core.js';

export const SECURITY_HEADERS = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
export const ASSET_PATHS = new Set(['/', '/index.html', '/app.js', '/app.css']);

export function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8' } });
}

export function publicConfig(env, localOwner = false) {
  return { name: 'LAEL', mode: env.OPENAI_API_KEY ? 'openai' : 'guide', requiresToken: !localOwner };
}

export async function authenticate(request, env) {
  if (typeof env.LAEL_PROTOTYPE_TOKEN !== 'string' || env.LAEL_PROTOTYPE_TOKEN.length < 32) {
    throw new PrototypeError(503, 'auth_unconfigured', 'Private access is not configured.');
  }
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw new PrototypeError(403, 'origin_denied', 'Use this prototype from its own origin.');
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ') || authorization.length > 520) throw new PrototypeError(401, 'unauthorized', 'Enter a valid private access token.');
  const encode = value => new TextEncoder().encode(value);
  const [expected, supplied] = await Promise.all([
    crypto.subtle.digest('SHA-256', encode(env.LAEL_PROTOTYPE_TOKEN)),
    crypto.subtle.digest('SHA-256', encode(authorization.slice(7)))
  ]);
  const a = new Uint8Array(expected), b = new Uint8Array(supplied);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  if (difference) throw new PrototypeError(401, 'unauthorized', 'Enter a valid private access token.');
  // Owner identity comes from trusted configuration, never from the request.
  return env.LAEL_OWNER_ID || 'owner';
}

export async function readJson(request) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new PrototypeError(415, 'content_type', 'Send JSON to this endpoint.');
  if (Number(request.headers.get('Content-Length')) > 8192) throw new PrototypeError(413, 'too_large', 'The request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new PrototypeError(400, 'invalid_json', 'The request body is missing.');
  const chunks = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 8192) { await reader.cancel(); throw new PrototypeError(413, 'too_large', 'The request is too large.'); }
    chunks.push(value);
  }
  const buffer = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer)); }
  catch { throw new PrototypeError(400, 'invalid_json', 'The request is not valid JSON.'); }
}

export function errorResponse(error) {
  return error instanceof PrototypeError ? json({ error: error.message, code: error.code }, error.status) :
    json({ error: 'The prototype is temporarily unavailable. Check its state before retrying.', code: 'unavailable' }, 503);
}

export async function handleApi(request, env, engine, { localOwner = false } = {}) {
  try {
    const path = new URL(request.url).pathname;
    if (path === '/api/config' && request.method === 'GET') return json(publicConfig(env, localOwner));
    const owner = await authenticate(request, env);
    if (path === '/api/state' && request.method === 'GET') return json(engine.snapshot(owner));
    if (!['/api/turn', '/api/resume', '/api/cancel'].includes(path)) return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST for this operation.' }, 405);
    const input = await readJson(request);
    let result;
    if (path === '/api/turn') result = await engine.execute(owner, input);
    else {
      if (!input || Array.isArray(input) || Object.keys(input).length !== 1 ||
        typeof input.requestId !== 'string' || !/^[\w-]{8,80}$/.test(input.requestId)) throw new PrototypeError(400, 'invalid_command', 'Choose a valid request ID.');
      result = path === '/api/resume' ? await engine.resume(owner, input.requestId) : engine.cancel(owner, input.requestId);
    }
    return json({ ...result, state: engine.snapshot(owner) }, result.error?.status || 200);
  } catch (error) { return errorResponse(error); }
}
