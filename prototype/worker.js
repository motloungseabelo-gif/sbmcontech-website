import { DurableObject } from 'cloudflare:workers';
import { CycleEngine } from './core.js';
import { SqlStore } from './store.js';
import { createModel } from './model.js';
import { ASSET_PATHS, SECURITY_HEADERS, authenticate, errorResponse, handleApi, json, publicConfig } from './handler.js';

export class LaelWorkspace extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const store = new SqlStore((sql, ...bindings) => [...ctx.storage.sql.exec(sql, ...bindings)],
      callback => ctx.storage.transactionSync(callback));
    this.engine = new CycleEngine({ store,
      ...(env.OPENAI_API_KEY ? { model: createModel(env), mode: 'openai' } : {}) });
  }

  async fetch(request) { return handleApi(request, this.env, this.engine); }
}

export default {
  async fetch(request, env) {
    try {
      const path = new URL(request.url).pathname;
      if (path === '/api/config' && request.method === 'GET') return json(publicConfig(env));
      if (path.startsWith('/api/')) {
        const owner = await authenticate(request, env);
        const workspace = env.LAEL_WORKSPACES.get(env.LAEL_WORKSPACES.idFromName(owner));
        return workspace.fetch(request);
      }
      if (!ASSET_PATHS.has(path) || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found.', { status: 404, headers: SECURITY_HEADERS });
      const asset = await env.ASSETS.fetch(request);
      return new Response(asset.body, { status: asset.status, headers: { ...Object.fromEntries(asset.headers), ...SECURITY_HEADERS } });
    } catch (error) { return errorResponse(error); }
  }
};
