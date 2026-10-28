# LAEL 3–7–12 private prototype

This is the first working experiment from the Lael research blueprint. It adds durable, owner-scoped memory and observable processing alongside the existing public website assistant. The public chat endpoint, website assets and production Worker configuration are independent of this prototype.

## Run locally

Use Node.js 24 LTS (the repository minimum is 22.13):

```bash
npm ci
npm run prototype
```

Open **http://127.0.0.1:4187**. The server binds to loopback, validates its host and rejects foreign origins. Without a configured access token, the loopback server acts as the local owner. It generates an internal token without printing or putting it in the browser. The Cloudflare adapter always requires the configured private token.

The default local guide can recall saved memories and explain the cycle. It is deliberately labelled as a guide; it is not a simulated live AI connection. Save a fact using **Add a memory**, then ask **What do you remember?**

### Optional private access and AI

Create an ignored environment file outside tracked source with:

```dotenv
LAEL_PROTOTYPE_TOKEN=<a randomly generated token of at least 32 characters>
OPENAI_API_KEY=<your server-side API key>
OPENAI_MODEL=gpt-5.4-mini
```

Load it with Node, for example:

```bash
node --env-file=prototype/.env.local prototype/local.mjs
```

The private access token is entered at the prototype's access screen. It remains in JavaScript memory for the current tab and is cleared on lock/reload; it is not an API key. The actual OpenAI key is used only by the server. No token is stored in localStorage, sessionStorage, cookies or URLs. Locking also fences pending responses so they cannot reopen the workspace.

Setting `OPENAI_API_KEY` selects the real Responses API adapter. It uses the existing project's model default, strict structured output, a 15-second deadline and `store: false`. Saved assertions and bounded conversation context are sent to the model for chat replies. A missing key leaves the app in the disclosed local-guide mode. A configured but failing key produces an explicit failed turn.

## What the numbers mean in this implementation

| Number | Implemented meaning |
| --- | --- |
| 3 | Memory, reasoning and action; an exchange has observation, interpretation and proposal fields |
| 7 | Receive → Retrieve → Reason → Check → Act → Verify → Remember |
| 12 | Maximum processed turns in an epoch before an automatic working-context reset |

This is one concrete interpretation of the proposed structure. Each user command takes one seven-stage pass; simple operations do not make seven model calls. Chat uses at most one model call, and explicit memory operations use none. Failed or cancelled attempts count as processed cycles, with their skipped/failed stages visible. A cycle counter is never evidence that a task succeeded.

After twelve processed turns, the final transaction stores checkpoint metadata, clears working messages and the latest exchange, and starts a new epoch. A manual reset performs the same working-context operation earlier. Approved memories, identity, permissions and replay receipts remain. This is an application soft reset, not model retraining or evidence of consciousness.

The seven stages are responsibilities, not seven scientifically privileged brain states. There is no quantum execution in this milestone, and the numerical scheme still needs comparison with simpler/adaptive designs.

## Working features

- Explicitly save up to 50 user-supplied memories; retrieve up to eight relevant/recent facts for a chat turn.
- Display the three-part exchange and the seven real server checkpoints.
- Persist state using SQLite, including across application restarts.
- Preserve saved memory through automatic and manual working-context resets.
- Remove a memory, clear working context, and redact cached chat replies that might repeat the removed fact.
- Scope state and every receipt lookup to the server-selected owner.
- Reject identity/permission fields supplied in commands and expose only four application actions: chat, remember, forget and reset.
- Replay an identical request ID without performing the operation or charging a model call again. Reject reusing that ID for a different command.
- Resume an interrupted turn from its last committed stage, with a lease and fencing token preventing obsolete workers from overwriting a newer result.
- Cancel before an action commits. After a saved change commits, reconcile it rather than claiming it was cancelled or rolling it back silently.
- Keep auth/error output bounded and use safe text rendering, same-origin API requests, no-store responses and a restrictive Content Security Policy.

## The meaning of verification

`storage_read_back` means the application checked the saved memory, memory removal or working-context change against SQLite state.

`response_format_checked` means the generated response satisfied the expected format and length limits. It does **not** establish factual correctness, moral judgement or successful external actions. The UI makes this distinction visible.

The model cannot write memory or execute tools. Only a validated owner command reaches a storage operation. Identity and principles are application constants; untrusted text cannot change them. A runtime constitution is an early behavioural control, not a proof of conscience or consciousness.

## Storage and recovery

`store.js` defines the shared SQLite schema and synchronous transactions. `local.mjs` adapts it to Node's SQLite API; `worker.js` adapts it to a SQLite-backed Cloudflare Durable Object. Network/model calls run outside storage transactions.

State holds approved memories, a bounded working conversation, counters, current lease and checkpoint metadata. Job rows hold request digests, stage traces, outcomes and replay receipts. Completed job rows discard their original command, retrieved context and candidate plan. Chat output is retained for request replay until redacted by memory removal. Task receipts are not erased by soft reset.

The history and receipts are a prototype audit/recovery mechanism; this milestone does not implement a complete retention/export policy or enterprise SSO. Use a single-owner trial. A later multi-user version needs verified identities and per-role permissions; adding a client-side owner field is not sufficient.

An interrupted process may leave a lease active for up to 30 seconds. The UI displays the pending stage and enables **Resume checkpoint** once the lease expires. If the storage write already committed, resume proceeds to verification instead of repeating the write. A model call interrupted before its plan was checkpointed may need to run again; read-only model work is not an exactly-once billing guarantee.

New owner commands are limited to 30 per minute. Public visitors have no route to this state or to the owner's credentials through the existing website assistant.

## Cloudflare packaging

The separate configuration is `prototype/wrangler.toml`, with Worker name `sbm-lael-prototype`, a dedicated SQLite-backed `LaelWorkspace` namespace and the prototype UI assets. The root `wrangler.toml` still describes the existing public assistant.

For a local Cloudflare trial, create the ignored `prototype/.dev.vars` file with a random `LAEL_PROTOTYPE_TOKEN` and optional `OPENAI_API_KEY`, then run:

```bash
npx wrangler@4 dev --local --config prototype/wrangler.toml
```

For a future approved deployment, configure `LAEL_PROTOTYPE_TOKEN` and optional `OPENAI_API_KEY` as Worker secrets. Use a separate deployment and review its identity/data boundaries before granting real business or device capabilities. This change does not deploy or merge anything automatically.

Validate the Worker bundle without publishing:

```bash
npx wrangler@4 deploy --dry-run --config prototype/wrangler.toml
```

## Validation

```bash
npm run test:lael-prototype
npm run test:lael-prototype-browser
npm run quality
```

The browser check uses installed Chrome/Chromium, or `CHROME_PATH`. It exercises real HTTP requests and SQLite through desktop/mobile UI flows. Its cancellation/private-lock scenarios substitute only the model, keeping UI, API and storage real. It checks safe rendering, saved-memory recall, reload, the twelve-cycle boundary, explicit deletion, private access, cancellation and late-response fencing. API/schema checks use model fixtures and do not claim a successful live paid-model call.

The repository's quality workflow runs the new tests alongside the existing website and assistant regressions. See `VERIFICATION.md` for recorded results and limits of this milestone.

## Current boundaries and next milestone

This version provides responses and explicit memory controls. It cannot send messages, book meetings, publish code, make commercial commitments, take payments or operate devices. Quantum computing is not connected.

Next: choose one genuine internal workflow, define its success condition and authority, and add a narrow tool with a real outcome receipt. Benchmark the 12-turn consolidation boundary against alternative/adaptive thresholds before treating the number pattern as an improvement.

## Documentation consulted

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [Cloudflare SQLite-backed Durable Object storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Cloudflare Durable Object best practices](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)
- [Cloudflare Worker/static asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
