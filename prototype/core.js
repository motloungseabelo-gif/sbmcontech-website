export const STAGES = ['Receive', 'Retrieve', 'Reason', 'Check', 'Act', 'Verify', 'Remember'];
export const IDENTITY = Object.freeze({
  name: 'LAEL', base: 3, stages: 7, roundLimit: 12,
  principles: ['Truthfulness', 'Consent', 'Care', 'Human control', 'Accountability'],
  capabilities: ['Respond', 'Save an explicit memory', 'Remove a saved memory', 'Reset working context']
});
const LEASE_MS = 30000;
const ACTIONS = ['chat', 'remember', 'forget', 'reset'];

export class PrototypeError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function validateCommand(input) {
  if (!input || Array.isArray(input) || typeof input !== 'object' ||
    Object.keys(input).some(key => !['requestId', 'action', 'message', 'memoryId'].includes(key)) ||
    typeof input.requestId !== 'string' || !/^[\w-]{8,80}$/.test(input.requestId) || !ACTIONS.includes(input.action)) {
    throw new PrototypeError(400, 'invalid_command', 'Use a valid request ID and a supported action.');
  }
  const command = { requestId: input.requestId, action: input.action };
  if (['chat', 'remember'].includes(input.action)) {
    const limit = input.action === 'remember' ? 500 : 1400;
    if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > limit || input.memoryId !== undefined) {
      throw new PrototypeError(400, 'invalid_message', `Enter between 1 and ${limit} characters.`);
    }
    command.message = input.message.trim();
  } else if (input.action === 'forget') {
    if (typeof input.memoryId !== 'string' || !/^[\w-]{8,80}$/.test(input.memoryId) || input.message !== undefined) {
      throw new PrototypeError(400, 'invalid_memory', 'Choose a saved memory to remove.');
    }
    command.memoryId = input.memoryId;
  } else if (input.message !== undefined || input.memoryId !== undefined) {
    throw new PrototypeError(400, 'invalid_command', 'A reset does not accept replacement memory or permissions.');
  }
  return command;
}

async function digest(command) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(command)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function checkLease(state, job, token) {
  if (!job || job.status !== 'running' || state.active?.id !== job.id || state.active.token !== token) {
    throw new PrototypeError(409, 'lease_lost', 'This turn was cancelled or resumed elsewhere. Refresh its state.');
  }
}

function resetWorking(state, reason, now) {
  state.checkpoint = {
    epoch: state.epoch, completedRounds: state.round, totalCycles: state.totalCycles,
    memoryIds: state.memories.map(memory => memory.id), reason, at: now
  };
  state.working = { messages: [], exchange: null };
  state.round = 0;
  state.epoch++;
  state.resets++;
}

function retrieve(memories, message) {
  const words = new Set((message || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
  return memories.map((memory, index) => ({ memory, index,
    score: [...words].filter(word => memory.text.toLowerCase().includes(word)).length
  })).sort((a, b) => b.score - a.score || b.index - a.index).slice(0, 8).map(item => item.memory);
}

export function guideReply({ message, memories }) {
  const lower = message.toLowerCase();
  if (/remember|saved|memory|know about/.test(lower)) {
    const lines = memories.map(memory => `• ${memory.text}`);
    let reply = 'These are facts you explicitly saved; I have not independently verified them.';
    for (const line of lines) { if ((reply + '\n' + line).length > 1250) break; reply += '\n' + line; }
    return { interpretation: 'Read the saved, user-supplied memories.',
      reply: memories.length ? reply : 'You have not saved any memories yet. Use “Add a memory” to save a fact explicitly.' };
  }
  if (/cycle|3.?7.?12|reset|how.*work/.test(lower)) return {
    interpretation: 'Explain the implemented cycle and its limits.',
    reply: 'My three functions are memory, reasoning and action. Each turn passes through Receive, Retrieve, Reason, Check, Act, Verify and Remember. After twelve processed turns, I checkpoint and clear working context. Saved memories remain. This local guide does not establish consciousness or quantum intelligence.'
  };
  return {
    interpretation: 'Use the local guide because no model is configured.',
    reply: 'I am running the local memory prototype. I can recall facts you save, explain the 3–7–12 cycle and reset working context. Broader AI replies need a server-side model connection.'
  };
}

function validateReply(plan) {
  if (!plan || typeof plan.interpretation !== 'string' || !plan.interpretation.trim() || plan.interpretation.length > 500 ||
    typeof plan.reply !== 'string' || !plan.reply.trim() || plan.reply.length > 1400) {
    throw new PrototypeError(502, 'invalid_model_output', 'The AI response was incomplete or invalid. No memory was saved.');
  }
  return { interpretation: plan.interpretation.trim(), reply: plan.reply.trim() };
}

export class CycleEngine {
  constructor({ store, model = guideReply, mode = 'guide', now = () => Date.now() }) {
    this.store = store; this.model = model; this.mode = mode; this.now = now;
    this.controllers = new Map();
  }

  snapshot(owner) {
    const state = this.store.read(owner);
    const pending = state.active ? this.store.job(owner, state.active.id) : null;
    return {
      identity: IDENTITY, mode: this.mode, revision: state.revision, epoch: state.epoch, round: state.round,
      totalCycles: state.totalCycles, resets: state.resets,
      memories: state.memories, working: state.working, checkpoint: state.checkpoint,
      active: pending ? { requestId: pending.id, phase: STAGES[pending.trace.length] || 'Remember',
        trace: pending.trace, canResume: state.active.leaseUntil <= this.now(), leaseUntil: state.active.leaseUntil } : null,
      recent: this.store.recent(owner).map(job => ({ requestId: job.id, action: job.action,
        status: job.status, trace: job.trace, createdAt: job.createdAt, receipt: job.result?.receipt || null }))
    };
  }

  async resume(owner, requestId) {
    const job = this.store.job(owner, requestId);
    if (!job) throw new PrototypeError(404, 'not_found', 'This workspace has no such turn.');
    if (job.status !== 'running') return { ...job.result, replayed: true };
    return this.execute(owner, job.command);
  }

  cancel(owner, requestId) {
    const result = this.store.mutate(owner, requestId, ({ state, job }) => {
      if (!job) throw new PrototypeError(404, 'not_found', 'This workspace has no such turn.');
      if (job.status !== 'running') return { ...job.result, replayed: true };
      if (job.trace.length >= 5) throw new PrototypeError(409, 'already_acted', 'The operation has already run. Verify or resume its result.');
      return this.finish(state, job, 'cancelled', 'Turn cancelled before its action.', null);
    });
    this.controllers.get(`${owner}:${requestId}`)?.abort();
    return result;
  }

  finish(state, job, status, reply, error = null) {
    const now = this.now();
    while (job.trace.length < 6) job.trace.push({ stage: STAGES[job.trace.length], status: 'skipped', at: now });
    job.trace.push({ stage: 'Remember', status: 'complete', at: now });
    state.totalCycles++;
    if (job.action !== 'reset' || status !== 'completed') state.round++;
    let reset = null;
    if (state.round >= IDENTITY.roundLimit) {
      resetWorking(state, 'twelve_cycles', now);
      reset = state.checkpoint;
    } else if (job.action === 'reset' && status === 'completed') {
      state.checkpoint.totalCycles = state.totalCycles;
      reset = state.checkpoint;
    }
    state.active = null;
    job.status = status;
    job.result = { requestId: job.id, status, reply, mode: this.mode,
      trace: [...job.trace], receipt: job.receipt || null, reset, error, replayed: false };
    // Preserve replay receipts, not the input, model context or candidate plan.
    job.command = null; job.context = null; job.plan = null; job.output = null;
    return job.result;
  }

  async execute(owner, input) {
    const command = validateCommand(input);
    const hash = await digest(command);
    const token = crypto.randomUUID();
    const cached = this.store.mutate(owner, command.requestId, draft => {
      const { state, job } = draft;
      if (job && job.digest !== hash) throw new PrototypeError(409, 'id_conflict', 'This request ID belongs to a different command.');
      if (job && job.status !== 'running') return { ...job.result, replayed: true };
      if (state.active && (state.active.id !== command.requestId || state.active.leaseUntil > this.now())) {
        throw new PrototypeError(409, 'busy', 'A turn is already in progress. Inspect, cancel or resume it first.');
      }
      if (!job) {
        state.requestTimes = state.requestTimes.filter(time => time > this.now() - 60000);
        if (state.requestTimes.length >= 30) throw new PrototypeError(429, 'rate_limited', 'Wait a moment before starting another turn.');
        state.requestTimes.push(this.now());
        draft.job = { id: command.requestId, digest: hash, action: command.action,
          command, trace: [], status: 'running', createdAt: this.now(), receipt: null };
      }
      state.active = { id: command.requestId, token, leaseUntil: this.now() + LEASE_MS };
      return null;
    });
    if (cached) return cached;
    const controller = new AbortController();
    const controllerKey = `${owner}:${command.requestId}`;
    this.controllers.set(controllerKey, controller);
    try {
      for (let index = this.store.job(owner, command.requestId).trace.length; index < STAGES.length; index++) {
        let plan;
        if (index === 2) {
          const job = this.store.job(owner, command.requestId);
          checkLease(this.store.read(owner), job, token);
          if (command.action === 'chat') plan = validateReply(await this.model({
            message: command.message, memories: job.context.memories,
            history: job.context.messages, signal: controller.signal
          }));
          else plan = {
            interpretation: command.action === 'remember' ? 'Save only the fact explicitly supplied by the owner.' :
              command.action === 'forget' ? 'Remove this saved fact and clear context that could recall it.' : 'Clear working context and preserve approved memories.',
            reply: command.action === 'remember' ? 'Memory saved.' : command.action === 'forget' ?
              'Saved memory removed. Working context and cached AI replies cleared.' : 'Working context reset. Saved memories retained.',
            memoryId: command.action === 'remember' ? crypto.randomUUID() : command.memoryId
          };
        }
        const result = this.store.mutate(owner, command.requestId, ({ state, job }) => {
          checkLease(state, job, token);
          if (job.trace.length !== index) throw new PrototypeError(409, 'lease_lost', 'The turn checkpoint changed.');
          if (index === 1) job.context = { memories: retrieve(state.memories, command.message), messages: state.working.messages };
          if (index === 2) job.plan = plan;
          if (index === 3) {
            if (command.action === 'remember' && state.memories.length >= 50) throw new PrototypeError(409, 'memory_limit', 'Remove a saved memory before adding another. The prototype holds up to 50.');
            if (command.action === 'forget' && !state.memories.some(memory => memory.id === command.memoryId)) throw new PrototypeError(404, 'not_found', 'This workspace has no such saved memory.');
            job.policy = ['Scoped workspace', 'Explicit action', 'No external tools'];
          }
          if (index === 4) {
            if (command.action === 'remember') state.memories.push({ id: job.plan.memoryId,
              text: command.message, source: 'user_supplied', createdAt: this.now() });
            if (command.action === 'forget') {
              state.memories = state.memories.filter(memory => memory.id !== command.memoryId);
              state.working = { messages: [], exchange: null };
              this.store.redactReplies(owner);
            }
            if (command.action === 'reset') resetWorking(state, 'manual', this.now());
            job.receipt = { id: job.id, kind: command.action, referenceId: job.plan.memoryId || null,
              verification: 'pending', at: this.now() };
            job.output = job.plan.reply;
          }
          if (index === 5) {
            if (command.action === 'remember' && !state.memories.some(memory => memory.id === job.plan.memoryId && memory.text === command.message)) throw new Error('Saved memory could not be read back.');
            if (command.action === 'forget' && state.memories.some(memory => memory.id === command.memoryId)) throw new Error('Memory removal could not be verified.');
            if (command.action === 'reset' && state.working.messages.length) throw new Error('Working context was not reset.');
            job.receipt.verification = command.action === 'chat' ? 'response_format_checked' : 'storage_read_back';
          }
          if (index === 6) {
            if (command.action === 'chat') state.working.messages = [...state.working.messages,
              { role: 'user', content: command.message }, { role: 'assistant', content: job.output }].slice(-6);
            if (['chat', 'remember'].includes(command.action)) state.working.exchange = {
              observation: command.message.slice(0, 500), interpretation: job.plan.interpretation,
              proposal: job.output.slice(0, 500)
            };
            return this.finish(state, job, 'completed', job.output);
          }
          job.trace.push({ stage: STAGES[index], status: 'complete', at: this.now() });
          return null;
        });
        if (result) return result;
      }
    } catch (error) {
      const existing = this.store.job(owner, command.requestId);
      if (existing && existing.status !== 'running') return existing.result;
      if (error instanceof PrototypeError && error.code !== 'lease_lost') {
        return this.store.mutate(owner, command.requestId, ({ state, job }) => {
          checkLease(state, job, token);
          job.trace.push({ stage: STAGES[job.trace.length], status: 'failed', at: this.now() });
          return this.finish(state, job, 'failed', error.message, { status: error.status, code: error.code });
        });
      }
      // An interrupted write may already have committed. Keep its checkpoint
      // for reconciliation; resuming skips every previously committed stage.
      this.store.mutate(owner, command.requestId, ({ state, job }) => {
        checkLease(state, job, token);
        state.active.leaseUntil = this.now();
      });
      throw new PrototypeError(503, 'interrupted', 'This turn was interrupted. Resume it to verify its saved checkpoint.');
    } finally {
      if (this.controllers.get(controllerKey) === controller) this.controllers.delete(controllerKey);
    }
  }
}
