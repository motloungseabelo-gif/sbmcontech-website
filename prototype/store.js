const initialState = () => ({
  schema: 1, revision: 0, epoch: 1, round: 0, totalCycles: 0, resets: 0,
  memories: [], working: { messages: [], exchange: null },
  active: null, checkpoint: null, requestTimes: []
});

// Both adapters execute these statements against SQLite. Every mutation is a
// synchronous transaction; no model/network call is made while it is open.
export class SqlStore {
  constructor(exec, transaction) {
    this.exec = exec;
    this.transaction = transaction;
    exec('CREATE TABLE IF NOT EXISTS lael_state (owner TEXT PRIMARY KEY, document TEXT NOT NULL)');
    exec(`CREATE TABLE IF NOT EXISTS lael_jobs (
      owner TEXT NOT NULL, id TEXT NOT NULL, action TEXT NOT NULL,
      status TEXT NOT NULL, created_at INTEGER NOT NULL, document TEXT NOT NULL,
      PRIMARY KEY (owner, id)
    )`);
    exec('CREATE INDEX IF NOT EXISTS lael_recent ON lael_jobs(owner, created_at DESC)');
  }

  read(owner) {
    const row = this.exec('SELECT document FROM lael_state WHERE owner = ?', owner)[0];
    const state = row ? JSON.parse(row.document) : initialState();
    state.revision ??= 0;
    return state;
  }

  job(owner, id) {
    const row = this.exec('SELECT document FROM lael_jobs WHERE owner = ? AND id = ?', owner, id)[0];
    return row ? JSON.parse(row.document) : null;
  }

  recent(owner) {
    return this.exec('SELECT document FROM lael_jobs WHERE owner = ? ORDER BY created_at DESC, rowid DESC LIMIT 12', owner)
      .map(row => JSON.parse(row.document));
  }

  mutate(owner, id, update) {
    return this.transaction(() => {
      const draft = { state: this.read(owner), job: this.job(owner, id) };
      const result = update(draft);
      draft.state.revision = (draft.state.revision || 0) + 1;
      this.exec(`INSERT INTO lael_state(owner, document) VALUES (?, ?)
        ON CONFLICT(owner) DO UPDATE SET document = excluded.document`, owner, JSON.stringify(draft.state));
      if (draft.job) {
        const job = draft.job;
        this.exec(`INSERT INTO lael_jobs(owner, id, action, status, created_at, document) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(owner, id) DO UPDATE SET status = excluded.status, document = excluded.document`,
        owner, id, job.action, job.status, job.createdAt, JSON.stringify(job));
      }
      return result;
    });
  }

  redactReplies(owner) {
    // Completed commands and retrieved context have already been discarded.
    // Remove cached chat responses too, so a forgotten fact cannot be replayed.
    this.exec(`UPDATE lael_jobs SET document = json_set(document, '$.result.reply',
      'Previous response cleared after a saved memory was removed.')
      WHERE owner = ? AND action = 'chat' AND status != 'running'`, owner);
  }
}
