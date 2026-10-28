import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { CycleEngine, PrototypeError } from './core.js';
import { SqlStore } from './store.js';
import { createModel } from './model.js';
import { ASSET_PATHS, SECURITY_HEADERS, errorResponse, handleApi } from './handler.js';

const directory = dirname(fileURLToPath(import.meta.url));

export function openStore(path) {
  const database = new DatabaseSync(path);
  database.exec('PRAGMA journal_mode = WAL');
  const exec = (sql, ...bindings) => database.prepare(sql).all(...bindings);
  const transaction = callback => {
    database.exec('BEGIN IMMEDIATE');
    try { const result = callback(); database.exec('COMMIT'); return result; }
    catch (error) { database.exec('ROLLBACK'); throw error; }
  };
  return { store: new SqlStore(exec, transaction), close: () => database.close() };
}

export async function createPrototypeServer({ databasePath, env = {}, model } = {}) {
  const path = databasePath || join(directory, '.data', 'lael.sqlite');
  if (path !== ':memory:') await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const localOwner = !env.LAEL_PROTOTYPE_TOKEN;
  const config = { ...env, LAEL_PROTOTYPE_TOKEN: env.LAEL_PROTOTYPE_TOKEN || randomBytes(32).toString('hex') };
  const database = openStore(path);
  const engine = new CycleEngine({ store: database.store,
    ...(model ? { model, mode: 'test' } : config.OPENAI_API_KEY ? { model: createModel(config), mode: 'openai' } : {}) });
  const server = createServer(async (incoming, outgoing) => {
    let response;
    try {
      const port = server.address().port;
      const host = incoming.headers.host;
      if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host) ||
        !incoming.url.startsWith('/') || incoming.url.startsWith('//')) throw new PrototypeError(403, 'host_denied', 'Use the local prototype address.');
      const origin = `http://${host}`;
      if (incoming.headers.origin && incoming.headers.origin !== origin) throw new PrototypeError(403, 'origin_denied', 'Cross-origin requests are not allowed.');
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > 8192) throw new PrototypeError(413, 'too_large', 'The request is too large.');
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      if (localOwner) headers.set('Authorization', `Bearer ${config.LAEL_PROTOTYPE_TOKEN}`);
      const request = new Request(origin + incoming.url, { method: incoming.method, headers,
        ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Buffer.concat(chunks) }) });
      const pathname = new URL(request.url).pathname;
      if (pathname.startsWith('/api/')) response = await handleApi(request, config, engine, { localOwner });
      else if (ASSET_PATHS.has(pathname) && ['GET', 'HEAD'].includes(request.method)) {
        const name = pathname === '/' ? 'index.html' : pathname.slice(1);
        response = new Response(request.method === 'HEAD' ? null : await readFile(join(directory, 'ui', name)), {
          headers: { ...SECURITY_HEADERS, 'Content-Type': name.endsWith('.html') ? 'text/html; charset=utf-8' :
            name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8' }
        });
      } else response = new Response('Not found.', { status: 404, headers: SECURITY_HEADERS });
    } catch (error) { response = errorResponse(error); }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  server.on('close', () => database.close());
  return { server, engine, store: database.store };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server } = await createPrototypeServer({ databasePath: process.env.LAEL_DATA_PATH, env: process.env });
  const port = Number(process.env.PORT || 4187);
  server.listen(port, '127.0.0.1', () => console.log(`LAEL prototype ready on http://127.0.0.1:${port} (${process.env.OPENAI_API_KEY ? 'AI configured' : 'local guide'})`));
}
