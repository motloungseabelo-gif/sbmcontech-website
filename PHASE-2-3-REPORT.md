# SBM website — Phase 2 and Phase 3 completion

Completed 7 October 2026 on `fix/sbm-scroll-lael`, continuing the Phase 1 checkpoint.

Repository: https://github.com/motloungseabelo-gif/sbmcontech-website

- Base: `main`, starting commit `503b45149b7bbd885377fc81ab6352f1c04d309c`.
- Published Phase 1 fixes: `5800bab9f9efe655a135d5e7da354297503177bd`.
- Published LAEL implementation and regression tests: `b101848f938adac0ddc3fc6a9785edef38b40d30`.

The local Git client lacked push credentials, so the connected GitHub app published the commits. Both published file-tree SHAs exactly match the tested local checkpoints (`e74a1c2` and `af1fb02`). The original local history is preserved on `checkpoint/sbm-scroll-lael-local`.

## LAEL fixes

- AI URLs previously appeared as plain text and went directly into speech. AI, predefined site-guide and fallback answers now share one normalizer and renderer. Display uses text nodes and safe anchors; speech gets separate natural-language text.
- Plain URLs, Markdown links, HTML anchors, encoded and double-encoded HTML, relative and absolute addresses, trailing slashes, query strings and fragments are covered. Known routes display **Contact page**, **Services page**, **About page** and other meaningful page names. Link destinations are retained. Unsafe protocols, scripts, event handlers and embedded media cannot enter the live conversation.
- Contact enquiries say exactly **“You can reach us through our contact page.”** and expose a clickable **Contact page** link to the actual `contact.html` route. Failed AI calls keep their explicit unavailability disclosure in both display and speech.
- The first question previously raced configuration loading. Configuration now has a three-second deadline, and a submitted question waits for it. Loading status is no longer overwritten by configuration completion.
- AI requests have an eighteen-second frontend deadline, allowing the Worker's fifteen-second deadline to return its controlled error. Malformed, empty, oversized and failed replies produce a clearly labelled local fallback and re-enable sending.
- One turn is submitted at a time. Button, Enter, suggestions and microphone transcripts share the same send path. Empty input and repeated submits do not add turns. The next-question draft survives a pending reply. Context remains bounded and ordered.
- Closing/reopening retains the current-page conversation. Page navigation cancels a pending turn; lifecycle recovery ignores stale replies and restores usable controls. No chat history is written to browser storage.
- The panel follows the mobile visual viewport and compacts on short screens, keeping the close button, message area, mute and input controls reachable above an emulated keyboard.
- New questions, mute, closing and navigation cancel speech. Closing/navigation also abort microphone recognition; late recognition events are ignored. Playback failures have visible feedback.
- The Worker now uses LAEL consistently, requests descriptive links and the approved contact wording, keeps its deadline active through response-body parsing, and rejects incomplete output instead of clipping a URL or link mid-response. Failed rate-limit bindings return a controlled error. API credentials remain in the existing Worker secret configuration.

There is no streaming response path: speech only runs after a complete, validated JSON response has been normalized. No website dependency was added.

## Scroll and site verification

The Phase 1 changes were retained and verified again: readable reveal content, current-position parallax with cached geometry, initial and post-load measurements, settling velocity, measured sticky-header anchor clearance, reduced-motion cleanup, history recovery, mobile navigation, enquiry validation/deadlines, Labs controls and offline cache recovery. SBM's visual identity and existing effects remain in place.

Real Chromium 153 through Playwright exercised all 15 root pages at 320, 412, 768, 1024 and 1440 pixels. The site suite repeated distant jumps, wheel reversals, scrollbar dragging, Home/End/Page Up/Page Down, touch start/move/end scrolling, scrolling during held image/font loading, section links, resize and reduced-motion changes, scrolling with LAEL open, retained-page lifecycle events, controlled enquiry submission failures/timeouts/success, Labs controls, script-free visibility and offline recovery.

LAEL was tested with all four requested questions:

- “What services does SBM offer?”
- “How do I contact SBM?”
- “Where is your contact page?”
- “How can I request a quote?”

Tests checked displayed answers, semantic link labels and exact destinations, context/order and the utterance passed to speech. Additional cases covered link formats, unsafe content, configuration delays/timeouts, HTTP 503/429, network failure, invalid JSON, null/empty/oversized replies, closed-panel replies, duplicate/empty input, microphone transcripts and cancellation, mute, style/voice selection, playback errors, stale navigation responses and following the Contact page link to its real enquiry form. Desktop, mobile and short-viewport screenshots were visually inspected.

## Results

| Check | Result |
| --- | --- |
| `npm run build` | Passed; 15 production pages |
| `npm run lint` | Passed; final expanded browser test also passed JS lint |
| `npm run test:performance` | Passed; existing asset and local-link budgets |
| `npm run test:lael` | Passed; 6 Worker tests |
| `npm run test:lael-browser` | Passed; final 178 assertions |
| `npm run test:responsive` | Passed; 15 pages × 5 viewport sizes |
| `npm run test:site` | Passed; 274 assertions |
| `npm run quality` | Passed; final added microphone/link checks rerun separately |
| `npm run lighthouse:ci` | Passed all configured assertions |
| `git diff --check` | Passed |

Final local homepage Lighthouse: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP **1.513 seconds**, CLS **0**, TBT **23ms**. These describe this local run. The lazy-loaded LAEL script is **16,498 bytes**, below its existing 19,000-byte budget.

## Files changed

Phase 2/3: `lael.js`, `lael.css`, generated `lael.min.js` and `lael.min.css`, `worker/src/index.js`, `tests/lael-worker.test.mjs`, new `scripts/lael-check.mjs`, `scripts/responsive-check.mjs`, `eslint.config.js`, `package.json`, `privacy-policy.html`, `README.md`, and this report.

The same pull request also includes the Phase 1 checkpoint: `script.js`, generated `script.min.js`, `styles/sbm-2.css` through `styles/sbm-5.css`, generated `style.min.css`, `app.html`, `contact.html`, `thank-you.html`, `sw.js`, `scripts/site-check.mjs`, the shared verification/configuration files above, and `PHASE-1-REPORT.md`.

## Limits and review

Browser testing included mobile viewport layouts, touch emulation and synthetic virtual-keyboard visual viewports. No physical phone or physical microphone was tested. Retained-page lifecycle events were dispatched explicitly; native back/forward-cache restoration was not claimed.

Actual audio playback could not be heard or verified. The unmocked browser exposed speech synthesis but had **zero installed voices** and returned **`synthesis-failed`** for the contact sentence. Regression tests verified the exact speech input, mute, cancellation and absence of overlapping utterances using controlled doubles.

No production enquiry or live AI message was sent. AI request/response behaviour and Worker integration were verified with mocks; production provider credentials, billing and live availability were not exercised. Website and Worker publishing remain part of the existing deployment process after review. The working branch is submitted as an open pull request against `main`; no merge or manual production deployment is part of this work.
