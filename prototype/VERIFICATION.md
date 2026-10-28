# Verification: LAEL 3–7–12 private prototype

Recorded on 28 October 2026.

**Story:** an authorised owner saves a fact through the UI → the private API validates the command → SQLite persists it → Lael recalls it, shows real stage checkpoints and retains the fact after a working-context reset.

| Boundary | Result | Evidence |
| --- | --- | --- |
| UI renders | Passed | Desktop and 320/390/768 px browser checks; no horizontal overflow or page errors |
| UI → API | Passed | Real HTTP requests for saving, recall, removal, reset and cancellation |
| API → SQLite | Passed | Memory saved and read back; real file-backed database reopened after server restart |
| Twelve-cycle boundary | Passed | Twelve processed turns reset working messages/exchange/counter and retain saved memory |
| SQLite → response → UI | Passed | Saved fact recalled; refreshed page recovers server state; all seven checkpoints shown |
| Private access | Passed | Missing token rejected; foreign origins rejected; private UI requires authentication again after reload |
| Lock/cancellation | Passed | Cancelled output discarded; late response cannot reopen a locked workspace or restore private text |
| Retry/recovery | Passed | Same request ID replays its receipt; changed command conflicts; resume after committed write does not duplicate memory |
| Stale worker | Passed | Expired worker cannot overwrite the result of a resumed turn |
| Data removal | Passed | Removing memory clears working context and redacts cached chat replies |
| Scope | Passed | Owner lookup is server selected; cross-owner memory/receipt access and command-supplied identity rejected |
| AI protocol | Passed with model fixtures | Strict structured output, bounded reply, no tools, explicit incomplete-output errors and deadline through body loading |
| Cloudflare packaging | Passed | Wrangler 4.154.0 dry run packages UI plus the dedicated SQLite Durable Object binding |
| Cloudflare runtime | Passed locally | Actual local Worker/Durable Object runtime: token access, save/read-back, seven stages, twelve-cycle boundary, retention and removal |

## Checks completed locally

- `npm run build`: 15 public pages built.
- `npm run lint`: JavaScript and CSS passed.
- `npm run test:performance`: public page budgets passed.
- `npm run test:lael`: all 6 existing Worker tests passed.
- `npm run test:lael-prototype`: all 14 new backend/integration tests passed.
- `npm run test:lael-prototype-browser`: all 39 assertions passed with actual UI/API/SQLite flows.
- `git diff --check`: passed.

The new browser checks used a temporary serverless Chromium 153 build in this execution environment. The complete `npm run quality` invocation passed the build, lint, performance, existing Worker, new backend and new browser checks, then stopped when that environment's browser exited during the existing multi-context public-assistant regression. The public browser/responsive/site suite and Lighthouse still require the standard Chrome CI runner; they are not recorded as locally passing here. Browser-installation workarounds are temporary and are not part of the repository.

## Material limits

- No live paid-model request was made: an OpenAI key was not configured in this environment. The local guide is real, labelled functionality; model tests substitute the upstream response.
- The Cloudflare runtime test was local. No Cloudflare service was deployed and no production Worker, secret or namespace was changed.
- The numerical structure is an implemented hypothesis. No benchmark has established an advantage over another consolidation threshold or an adaptive policy.
- Response-format checking does not certify factual correctness. Storage verification establishes a specific saved-state outcome.
- This is a single-owner prototype with a shared access token, not enterprise SSO or a complete data-retention system. It has no external business/device tools, consciousness claim or quantum execution.
