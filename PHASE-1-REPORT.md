# SBM website — Phase 1 completion

Completed 7 October 2026 on local branch `fix/sbm-scroll-lael`.

Repository: https://github.com/motloungseabelo-gif/sbmcontech-website

Starting commit: `503b45149b7bbd885377fc81ab6352f1c04d309c`. The starting checkout was clean. The existing `main` branch and production deployment were preserved. This phase has a local Git checkpoint; pushing and opening a pull request are reserved for Phase 3.

## Problems reproduced and fixed

- Rapid jumps to capability and work sections left visible cards at zero opacity with blurred, clipped entry states. Content now stays readable before, during and after animation, including when JavaScript is unavailable. The entry movement uses the individual CSS `translate` property so it does not overwrite parallax transforms.
- Newly visible depth layers could have no measurements until another scroll event. Depth now derives from the current scroll position and cached layout offsets, with an initial render and refresh after image/font loading, resize and orientation changes.
- The scroll velocity tilt stayed at `0.980deg` after scrolling stopped. It now settles to zero.
- Fragment links landed behind the sticky header. Scroll padding follows the measured header height; the tested infrastructure anchor moved from approximately 0px to 93px below the viewport top, clearing the 77px header.
- Enabling reduced motion did not stop the existing scroll calculation. Preference changes now stop and clear the motion effects, observers, event handlers and pending frames; disabling reduced motion restores them.
- Navigation wipes and motion handlers could persist across retained-page history recovery. The page lifecycle now cleans up and restores them without duplicate wipe layers.
- The mobile navigation was approximately 24px below the header. It now opens directly beneath the header, limits its height to the available viewport and closes on Escape, outside interaction, keyboard focus leaving the header, or a desktop breakpoint change.
- Enter in the third enquiry-form step triggered validation errors for hidden name/email fields. Each visible step now validates and advances safely. Whitespace-only required text, invalid email, early submission, and duplicate submission are handled.
- A stalled enquiry request could leave the form disabled indefinitely. Requests now have a 20-second timeout, an announced loading/error state and recovery controls. Submission is cancelled when the page is left.
- `thank-you.html` contained invalid optional-chaining assignment syntax. The unused inline script was removed, eliminating its browser error.
- The Labs utility bars disagreed with refreshed readings. Bars now follow the readings; toggle and scene states expose `aria-pressed`, and ambiguous temperature/access buttons have descriptive labels.
- Offline cache revalidation could reject without a handler or outlive the service-worker event. Revalidation now stays alive and handles network failures. The cache version was advanced to `sbm-contech-v3`; cleanup targets only older SBM caches.

SBM's colours, logos, fonts, copy, page order, corporate-park background, portrait layers, parallax, pointer depth, ticker and navigation transition remain in place. No production enquiry or AI request was sent during testing. No dependency was added to the website.

## Validation

| Check | Result |
| --- | --- |
| `npm run build` | Passed; 15 production pages generated |
| `npm run lint` | Passed |
| `npm run test:performance` | Passed; 15 pages and existing asset/link budgets |
| `npm run test:lael` | Passed; all 3 existing Worker tests |
| `npm run test:responsive` | Passed; all 15 root HTML pages at 320, 412, 768, 1024 and 1440px |
| `npm run quality` | Passed; strengthened final site checks were also rerun separately |
| `npm run test:site` | Passed; final suite has 274 assertions |
| `npm run lighthouse:ci` | Passed all configured assertions |
| `git diff --check` | Passed |

The final site suite covers distant scroll jumps on Home, Solutions, Work, Company and Contact; repeated wheel scrolling with reversals; Home/End/Page Up/Page Down; real scrollbar dragging; desktop/tablet/mobile resizing; direct and clicked fragment navigation; scrolling with LAEL open; scrolling while images and fonts are held back; dynamic reduced motion; navigation lifecycle restoration; keyboard and mocked enquiry flows; Labs controls; script-free content visibility; and offline cache recovery. Touch tests dispatch touch start/move/end events and assert that the page actually moves.

Forms were tested with controlled `.invalid` email addresses and intercepted requests, including a failed response, a stalled request, duplicate Enter submission, invalid fields and a successful response leading to the thank-you page. The existing responsive suite also verifies LAEL opening and a mocked configured-AI response.

Local Lighthouse homepage results: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP **1.516 seconds**, CLS **0**, total blocking time **68ms**. These are measurements from this local run, not production guarantees.

Browser: headless Chromium 153 controlled through Playwright. Desktop and mobile screenshots were visually inspected. Mobile viewport testing and touch emulation were performed; no physical phone was tested. Retained-page lifecycle events were exercised explicitly; no claim is made that this browser used a native back/forward-cache restoration.

## Files changed

- UI and motion: `script.js`, generated `script.min.js`.
- Styles: `styles/sbm-2.css`, `styles/sbm-3.css`, `styles/sbm-4.css`, `styles/sbm-5.css`, generated `style.min.css`.
- Page fixes: `app.html`, `contact.html`, `thank-you.html`.
- Offline loading: `sw.js`.
- Verification and commands: `scripts/responsive-check.mjs`, new `scripts/site-check.mjs`, `eslint.config.js`, `package.json`.
- Documentation: `README.md`, this report.

## Remaining phases

Phase 2: LAEL conversation recovery, shared safe link display, and URL-free speech normalization. The LAEL response renderer, AI Worker, and speech implementation were inspected but not changed in Phase 1. Actual audio playback and live AI service availability were not verified.

Phase 3: full LAEL-specific browser/regression validation, GitHub push, and an open pull request for review. No pull request, merge or deployment was performed during Phase 1. The local preview could not be reached from the separate cloud browser, so browser verification used the local Playwright-controlled Chromium instead.
