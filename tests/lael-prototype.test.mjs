import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CycleEngine, PrototypeError, STAGES } from '../prototype/core.js';
import { openStore, createPrototypeServer } from '../prototype/local.mjs';
import { handleApi } from '../prototype/handler.js';
import { createModel } from '../prototype/model.js';

const command = (action, fields = {}) => ({ requestId: crypto.randomUUID(), action, ...fields });
const gate = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };
const errorCode = code => error => error instanceof PrototypeError && error.code === code;

function fixture(t, options = {}) {
  const db = openStore(':memory:');
  t.after(() => db.close());
  return { ...db, engine: new CycleEngine({ store: db.store, ...options }) };
}

test('seven real stages, a three-part exchange and explicit memory writes', async t => {
  const { engine, store } = fixture(t, { model: async () => ({ interpretation: 'Draft a reply without saving a fact.', reply: 'Use the memory control to save that explicitly.' }) });
  const input = command('chat', { message: 'Remember that the project is Lael.' });
  const result = await engine.execute('owner', input);
  assert.deepEqual(result.trace.map(step => step.stage), STAGES);
  assert.ok(result.trace.every(step => step.status === 'complete'));
  assert.equal(result.receipt.verification, 'response_format_checked');
  assert.equal(engine.snapshot('owner').memories.length, 0);
  assert.deepEqual(Object.keys(engine.snapshot('owner').working.exchange), ['observation', 'interpretation', 'proposal']);
  const stored = store.job('owner', input.requestId);
  assert.equal(stored.command, null);
  assert.equal(stored.context, null);
  assert.equal(stored.plan, null);
});

test('SQLite persists across restarts and twelve rounds clear context while retaining memories', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'lael-persist-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'state.sqlite');
  let db = openStore(path);
  let engine = new CycleEngine({ store: db.store });
  await engine.execute('owner', command('remember', { message: 'Our assistant is called Lael.' }));
  await engine.execute('owner', command('chat', { message: 'What do you remember?' }));
  assert.equal(engine.snapshot('owner').round, 2);
  db.close();
  db = openStore(path);
  t.after(() => db.close());
  engine = new CycleEngine({ store: db.store });
  assert.equal(engine.snapshot('owner').working.messages.length, 2);
  assert.equal(engine.snapshot('owner').memories[0].text, 'Our assistant is called Lael.');
  for (let index = 0; index < 10; index++) await engine.execute('owner', command('chat', { message: 'Explain your cycle.' }));
  const state = engine.snapshot('owner');
  assert.equal(state.totalCycles, 12);
  assert.equal(state.round, 0);
  assert.equal(state.epoch, 2);
  assert.equal(state.resets, 1);
  assert.equal(state.working.messages.length, 0);
  assert.equal(state.working.exchange, null);
  assert.equal(state.memories.length, 1);
  assert.equal(state.checkpoint.completedRounds, 12);
  assert.equal(state.checkpoint.totalCycles, 12);
  assert.equal(state.checkpoint.reason, 'twelve_cycles');
});

test('repeated request IDs replay receipts and never repeat a saved operation', async t => {
  const { engine } = fixture(t);
  const input = command('remember', { message: 'Approved project fact.' });
  const first = await engine.execute('owner', input);
  const replay = await engine.execute('owner', input);
  assert.equal(replay.replayed, true);
  assert.deepEqual(first.receipt, replay.receipt);
  assert.equal(engine.snapshot('owner').memories.length, 1);
  assert.equal(engine.snapshot('owner').totalCycles, 1);
  await assert.rejects(engine.execute('owner', { ...input, message: 'Changed command.' }), errorCode('id_conflict'));
});

test('workspaces are isolated and request bodies cannot supply identity or permissions', async t => {
  const { engine } = fixture(t);
  const input = command('remember', { message: 'Owner A project fact.' });
  const result = await engine.execute('owner-a', input);
  assert.equal(engine.snapshot('owner-b').memories.length, 0);
  const missing = await engine.execute('owner-b', command('forget', { memoryId: result.receipt.referenceId }));
  assert.equal(missing.status, 'failed');
  assert.equal(missing.error.status, 404);
  assert.equal(engine.snapshot('owner-a').memories.length, 1);
  await assert.rejects(engine.resume('owner-b', input.requestId), errorCode('not_found'));
  await assert.rejects(engine.execute('owner-b', { ...command('reset'), owner: 'owner-a' }), errorCode('invalid_command'));
  await assert.rejects(engine.execute('owner-b', { ...command('chat', { message: 'Hello' }), permissions: ['admin'] }), errorCode('invalid_command'));
});

test('a failed model response is recorded as failure, without an action or a new fact', async t => {
  const { engine } = fixture(t, { model: async () => ({ reply: '', interpretation: 'Invalid output.' }) });
  const result = await engine.execute('owner', command('chat', { message: 'Draft a project brief.' }));
  assert.equal(result.status, 'failed');
  assert.equal(result.error.code, 'invalid_model_output');
  assert.equal(result.trace[2].status, 'failed');
  assert.equal(result.trace[4].status, 'skipped');
  assert.equal(result.trace.length, 7);
  assert.equal(result.receipt, null);
  assert.equal(engine.snapshot('owner').working.messages.length, 0);
  assert.equal(engine.snapshot('owner').active, null);
});

test('concurrent turns cannot race memory, and cancellation fences a late model result', async t => {
  const started = gate(), waiting = gate();
  const { engine, store } = fixture(t, { model: async () => { started.release(); return waiting.promise; } });
  const input = command('chat', { message: 'A pending turn.' });
  const pending = engine.execute('owner', input);
  await started.promise;
  const second = new CycleEngine({ store });
  await assert.rejects(second.execute('owner', command('remember', { message: 'Do not race.' })), errorCode('busy'));
  await assert.rejects(second.execute('owner', input), errorCode('busy'));
  const cancelled = second.cancel('owner', input.requestId);
  assert.equal(cancelled.status, 'cancelled');
  waiting.release({ interpretation: 'Late result.', reply: 'This must not enter working context.' });
  assert.equal((await pending).status, 'cancelled');
  assert.equal(engine.snapshot('owner').working.messages.length, 0);
  assert.equal(engine.snapshot('owner').totalCycles, 1);
});

test('recovery after a committed write verifies the checkpoint without repeating the operation', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'lael-recovery-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'state.sqlite');
  let db = openStore(path);
  const original = db.store.mutate.bind(db.store);
  let interrupt = true;
  db.store.mutate = (owner, id, update) => {
    const value = original(owner, id, update);
    if (interrupt && db.store.job(owner, id)?.trace.length === 5) { interrupt = false; throw new Error('Simulated process loss after commit.'); }
    return value;
  };
  let engine = new CycleEngine({ store: db.store });
  const input = command('remember', { message: 'This memory must be written once.' });
  await assert.rejects(engine.execute('owner', input), errorCode('interrupted'));
  assert.equal(engine.snapshot('owner').memories.length, 1);
  assert.equal(engine.snapshot('owner').active.phase, 'Verify');
  assert.equal(engine.snapshot('owner').active.canResume, true);
  assert.throws(() => engine.cancel('owner', input.requestId), errorCode('already_acted'));
  db.close();
  db = openStore(path);
  t.after(() => db.close());
  engine = new CycleEngine({ store: db.store });
  const result = await engine.resume('owner', input.requestId);
  assert.equal(result.status, 'completed');
  assert.equal(result.receipt.verification, 'storage_read_back');
  assert.equal(engine.snapshot('owner').memories.length, 1);
  assert.equal(engine.snapshot('owner').totalCycles, 1);
});

test('an expired worker cannot overwrite the result of a resumed turn', async t => {
  let now = 1000;
  const started = gate(), waiting = gate();
  const { engine, store } = fixture(t, { now: () => now, model: async () => { started.release(); return waiting.promise; } });
  const input = command('chat', { message: 'Resume this safely.' });
  const pending = engine.execute('owner', input);
  await started.promise;
  now += 31000;
  const resumed = new CycleEngine({ store, now: () => now, model: async () => ({ interpretation: 'Recovered turn.', reply: 'The resumed result.' }) });
  const result = await resumed.resume('owner', input.requestId);
  waiting.release({ interpretation: 'Obsolete turn.', reply: 'The stale result.' });
  assert.equal((await pending).reply, result.reply);
  assert.equal(resumed.snapshot('owner').working.messages.at(-1).content, 'The resumed result.');
  assert.equal(resumed.snapshot('owner').totalCycles, 1);
});

test('forgetting a memory clears context and cached replies that could reintroduce it', async t => {
  const { engine, store } = fixture(t);
  const text = 'A temporary project fact to forget.';
  const saved = await engine.execute('owner', command('remember', { message: text }));
  const recall = command('chat', { message: 'What do you remember?' });
  assert.match((await engine.execute('owner', recall)).reply, /temporary project fact/);
  const removed = await engine.execute('owner', command('forget', { memoryId: saved.receipt.referenceId }));
  assert.equal(removed.receipt.verification, 'storage_read_back');
  assert.equal(engine.snapshot('owner').memories.length, 0);
  assert.equal(engine.snapshot('owner').working.messages.length, 0);
  const replay = await engine.execute('owner', recall);
  assert.doesNotMatch(replay.reply, /temporary project fact/);
  assert.equal(JSON.stringify(store.recent('owner')).includes(text), false);
});

test('manual reset preserves identity, saved facts and receipts without retaining working messages', async t => {
  const { engine } = fixture(t);
  const input = command('remember', { message: 'Keep this approved memory.' });
  await engine.execute('owner', input);
  await engine.execute('owner', command('chat', { message: 'What do you remember?' }));
  const result = await engine.execute('owner', command('reset'));
  const state = engine.snapshot('owner');
  assert.equal(result.receipt.verification, 'storage_read_back');
  assert.equal(state.identity.name, 'LAEL');
  assert.equal(state.memories.length, 1);
  assert.equal(state.working.messages.length, 0);
  assert.equal(state.round, 0);
  assert.equal((await engine.execute('owner', input)).replayed, true);
});

test('the private API rejects missing tokens, hostile origins, identity overrides and oversized JSON', async t => {
  const { engine } = fixture(t);
  const env = { LAEL_PROTOTYPE_TOKEN: 'a-test-token-that-is-at-least-32-characters' };
  const request = (path, body, headers = {}) => new Request(`https://private.example${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${env.LAEL_PROTOTYPE_TOKEN}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const unauthorised = await handleApi(request('/api/state', undefined, { Authorization: '' }), env, engine);
  assert.equal(unauthorised.status, 401);
  assert.equal(unauthorised.headers.get('Access-Control-Allow-Origin'), null);
  assert.match(unauthorised.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.equal((await handleApi(request('/api/state', undefined, { Origin: 'https://attacker.example' }), env, engine)).status, 403);
  assert.equal((await handleApi(request('/api/turn', { ...command('reset'), owner: 'other' }), env, engine)).status, 400);
  assert.equal((await handleApi(request('/api/turn'), env, engine)).status, 405);
  assert.equal((await handleApi(request('/api/turn', command('chat', { message: 'é'.repeat(5000) })), env, engine)).status, 413);
  const result = await handleApi(request('/api/turn', command('remember', { message: 'API memory.' })), env, engine);
  assert.equal(result.status, 200);
  assert.equal((await result.text()).includes(env.LAEL_PROTOTYPE_TOKEN), false);
  const missing = await handleApi(request('/api/state'), {}, engine);
  assert.equal(missing.status, 503);
});

test('the model adapter uses structured output, bounded replies and no tool authority', async () => {
  let payload;
  const model = createModel({ OPENAI_API_KEY: 'test-api-secret' }, async (_url, options) => {
    payload = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, 'Bearer test-api-secret');
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ interpretation: 'Interpret the request.', reply: 'A bounded reply.' }) }] }] });
  });
  const result = await model({ message: 'Hello', memories: [], history: [] });
  assert.equal(result.reply, 'A bounded reply.');
  assert.equal(payload.store, false);
  assert.equal(payload.model, 'gpt-5.4-mini');
  assert.equal(payload.text.format.type, 'json_schema');
  assert.equal(payload.text.format.strict, true);
  assert.equal(payload.tools, undefined);
  assert.equal(payload.max_output_tokens, 600);
  const invalid = createModel({ OPENAI_API_KEY: 'test' }, async () => Response.json({ status: 'incomplete', output: [] }));
  await assert.rejects(invalid({ message: 'Hello', memories: [], history: [] }), errorCode('invalid_model_output'));
});

test('the model deadline covers body loading and does not expose upstream diagnostics', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const started = gate();
  const model = createModel({ OPENAI_API_KEY: 'test' }, async (_url, options) => ({
    ok: true, json: () => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('private upstream information')), { once: true });
      started.release();
    })
  }));
  const pending = model({ message: 'Hello', memories: [], history: [] });
  await started.promise;
  t.mock.timers.tick(15001);
  await assert.rejects(pending, error => error.status === 504 && !error.message.includes('private upstream'));
  t.mock.timers.reset();
});

test('the actual HTTP app persists memory, serves only its UI and denies foreign origins', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'lael-http-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'state.sqlite');
  let app = await createPrototypeServer({ databasePath: path });
  const listen = () => new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const close = () => new Promise(resolve => app.server.close(resolve));
  await listen();
  let origin = `http://127.0.0.1:${app.server.address().port}`;
  assert.equal((await fetch(origin)).status, 200);
  assert.equal((await fetch(origin + '/prototype/wrangler.toml')).status, 404);
  assert.equal((await fetch(origin + '/api/state', { headers: { Origin: 'https://attacker.example' } })).status, 403);
  const response = await fetch(origin + '/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command('remember', { message: 'Survives an HTTP server restart.' })) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).receipt.verification, 'storage_read_back');
  await close();
  app = await createPrototypeServer({ databasePath: path });
  await listen();
  t.after(close);
  origin = `http://127.0.0.1:${app.server.address().port}`;
  const state = await (await fetch(origin + '/api/state')).json();
  assert.equal(state.memories[0].text, 'Survives an HTTP server restart.');
});
