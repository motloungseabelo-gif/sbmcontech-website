const $ = id => document.getElementById(id);
const STAGES = ['Receive', 'Retrieve', 'Reason', 'Check', 'Act', 'Verify', 'Remember'];
let token = '';
let config;
let state;
let busy = false;
let pollTimer;
let sessionVersion = 0;
class SessionChanged extends Error {}

function notice(message = '') { $('notice').textContent = message; $('notice').hidden = !message; }

async function api(path, body) {
  const version = sessionVersion;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 23000);
  try {
    const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', signal: controller.signal });
    const data = await response.json();
    if (version !== sessionVersion) throw new SessionChanged();
    if (!response.ok && !data.state) {
      if (response.status === 401) lock();
      throw new Error(data.error || 'The request could not be completed.');
    }
    return data;
  } finally { clearTimeout(timeout); }
}

function lock() {
  sessionVersion++;
  busy = false;
  token = ''; state = null; clearTimeout(pollTimer);
  $('workspace').hidden = true; $('access-panel').hidden = false; $('disconnect').hidden = true;
  $('messages').replaceChildren(); $('memory-list').replaceChildren();
  for (const id of ['message', 'memory-text', 'access-token']) $(id).value = '';
  for (const id of ['observation', 'interpretation', 'proposal', 'checkpoint-detail', 'cycle-caption', 'result-status']) $(id).textContent = '';
  $('connection').textContent = 'Workspace locked';
}

function message(role, content) {
  const item = document.createElement('li'); item.className = role;
  const speaker = document.createElement('span'); speaker.className = 'speaker'; speaker.textContent = role === 'user' ? 'YOU' : 'LAEL';
  const paragraph = document.createElement('p'); paragraph.textContent = content;
  item.append(speaker, paragraph); return item;
}

function render() {
  if (!state) return;
  $('workspace').hidden = false; $('access-panel').hidden = true;
  $('disconnect').hidden = !config.requiresToken;
  $('connection').textContent = 'Workspace connected';
  $('mode-label').textContent = state.mode === 'openai' ? 'AI configured' : 'Local guide';
  $('guide-note').hidden = state.mode === 'openai';
  $('mode-detail').textContent = 'Persistent memory · no external actions';
  $('round-value').textContent = state.round; $('epoch-value').textContent = state.epoch;
  $('round-progress').value = state.round;
  $('round-progress').textContent = `${state.round} of 12`;
  $('cycle-total').textContent = `${state.totalCycles} processed turn${state.totalCycles === 1 ? '' : 's'}`;
  $('memory-count').textContent = state.memories.length; $('retained-count').textContent = state.memories.length;
  $('reset-count').textContent = state.resets;

  const conversation = state.working.messages.map(item => message(item.role, item.content));
  $('messages').replaceChildren(...conversation);
  $('empty-conversation').hidden = conversation.length > 0;
  $('messages').scrollTop = $('messages').scrollHeight;
  $('memory-list').replaceChildren(...state.memories.map(memory => {
    const item = document.createElement('li');
    const paragraph = document.createElement('p'); paragraph.textContent = memory.text;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'remove-memory'; button.textContent = '×';
    button.setAttribute('aria-label', `Remove saved memory: ${memory.text.slice(0, 80)}`);
    button.disabled = busy || !!state.active;
    button.addEventListener('click', () => run('forget', { memoryId: memory.id }));
    item.append(paragraph, button); return item;
  }));
  $('memory-empty').hidden = state.memories.length > 0;

  const recent = state.recent[0];
  const trace = state.active?.trace || recent?.trace || [];
  $('stages').replaceChildren(...STAGES.map((name, index) => {
    const item = document.createElement('li');
    const status = trace[index]?.status || (state.active && index === trace.length ? 'active' : 'waiting');
    item.className = status;
    const dot = document.createElement('span'); dot.className = 'stage-dot'; dot.textContent = status === 'complete' ? '✓' : index + 1; dot.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.className = 'stage-name'; label.textContent = name;
    const description = document.createElement('span'); description.className = 'stage-status'; description.textContent = status;
    item.append(dot, label, description); return item;
  }));
  $('cycle-caption').textContent = state.active ? `Current turn · ${state.active.phase}` : recent ? `Last turn · ${recent.status}. Checkpoints are recorded by the server.` : 'Stages update from real server checkpoints.';
  $('turn-state').textContent = state.active || busy ? 'Processing' : 'Ready';
  $('chat-form').setAttribute('aria-busy', String(busy || !!state.active));
  for (const id of ['send', 'save-memory', 'reset']) $(id).disabled = busy || !!state.active;
  $('cancel').hidden = !state.active;
  $('cancel').disabled = (state.active?.trace.length || 0) >= 5;
  $('resume').hidden = !state.active;
  $('resume').disabled = !state.active?.canResume || busy;
  if (state.checkpoint) {
    $('checkpoint-title').textContent = 'Context cleared. Memory retained.';
    const date = new Date(state.checkpoint.at).toLocaleString();
    $('checkpoint-detail').textContent = `${state.checkpoint.reason === 'manual' ? 'Manual reset' : 'Twelve-cycle checkpoint'} · ${date}. ${state.checkpoint.memoryIds.length} saved memor${state.checkpoint.memoryIds.length === 1 ? 'y' : 'ies'} retained at that boundary.`;
  }
  const exchange = state.working.exchange;
  $('observation').textContent = exchange?.observation || 'Temporary exchange is empty.';
  $('interpretation').textContent = exchange?.interpretation || 'No interpretation retained in working context.';
  $('proposal').textContent = exchange?.proposal || 'Ready for the next response or action.';
  if (state.active) schedulePoll();
}

function schedulePoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    try { acceptState(await api('/api/state')); render(); }
    catch (error) { if (!(error instanceof SessionChanged)) notice(error.message); }
  }, 650);
}

function acceptState(next) {
  if (!state || next.revision >= state.revision) state = next;
}

function showResult(result) {
  acceptState(result.state);
  if (result.status === 'failed') notice(result.reply);
  else notice();
  const check = result.receipt?.verification;
  const description = check === 'storage_read_back' ? 'Saved change checked by reading storage.' :
    check === 'response_format_checked' ? 'Response format checked. Factual accuracy is not independently certified.' : result.reply;
  $('result-status').textContent = `${result.replayed ? 'Previous result recovered. ' : ''}${description}${result.reset ? ' Working context was reset; saved memory remains.' : ''}`;
  render();
}

async function run(action, fields = {}) {
  if (busy || state?.active) return null;
  const version = sessionVersion;
  busy = true; notice(); render();
  const command = { requestId: crypto.randomUUID(), action, ...fields };
  schedulePoll();
  try {
    const result = await api('/api/turn', command);
    showResult(result);
    return result;
  } catch (error) {
    if (version !== sessionVersion || error instanceof SessionChanged) return null;
    notice(`${error.message} Check the current turn before starting another.`);
    try { acceptState(await api('/api/state')); } catch { /* Keep the last confirmed view. */ }
    return null;
  } finally { if (version === sessionVersion) { busy = false; render(); } }
}

$('access-form').addEventListener('submit', async event => {
  event.preventDefault(); sessionVersion++; token = $('access-token').value; $('access-token').value = '';
  try { acceptState(await api('/api/state')); notice(); render(); }
  catch (error) { if (!(error instanceof SessionChanged)) { token = ''; notice(error.message); } }
});
$('disconnect').addEventListener('click', lock);
$('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('message').value.trim(); if (!input) return;
  const result = await run('chat', { message: input });
  if (result?.status === 'completed') $('message').value = '';
});
$('message').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); }
});
$('memory-form').addEventListener('submit', async event => {
  event.preventDefault(); const text = $('memory-text').value.trim(); if (!text) return;
  const result = await run('remember', { message: text });
  if (result?.status === 'completed') $('memory-text').value = '';
});
$('reset').addEventListener('click', () => run('reset'));
for (const button of document.querySelectorAll('[data-prompt]')) button.addEventListener('click', () => {
  $('message').value = button.dataset.prompt; $('message').focus();
});
$('resume').addEventListener('click', async () => {
  if (!state?.active || busy) return;
  const version = sessionVersion;
  busy = true; render();
  try { showResult(await api('/api/resume', { requestId: state.active.requestId })); }
  catch (error) { if (!(error instanceof SessionChanged)) notice(error.message); }
  finally { if (version === sessionVersion) { busy = false; render(); } }
});
$('cancel').addEventListener('click', async () => {
  if (!state?.active) return;
  try { showResult(await api('/api/cancel', { requestId: state.active.requestId })); }
  catch (error) { if (!(error instanceof SessionChanged)) notice(error.message); }
});

try {
  config = await api('/api/config');
  if (config.requiresToken) lock();
  else { state = await api('/api/state'); render(); }
} catch (error) { $('connection').textContent = 'Connection unavailable'; notice(error.message); }

// No localStorage, sessionStorage, cookies or URL tokens. Memory lives on the
// authenticated backend.
window.addEventListener('pagehide', () => {
  if (config?.requiresToken) lock();
  else { token = ''; clearTimeout(pollTimer); }
});
