# October 2026 design and reliability release

This refinement preserves SBM ConTech Industries' existing navy, bronze, cream and blue palette, public content, URLs and integrations. It improves the hierarchy and spacing of the existing website without changing its hosting or introducing a frontend framework.

## Architecture and preservation audit

- The production site is static HTML, CSS and vanilla JavaScript, hosted by GitHub Pages from the root of `main`, with `www.sbmcontech.co.za` in `CNAME`.
- All 15 published root pages and nine legacy HTML files remain. Legacy duplicates have canonical destinations and `noindex,follow`; unpublished divisions, the thank-you page and the 404 page remain accessible but are excluded from the sitemap.
- The existing build minifies production files, prepares responsive assets and versions shared stylesheet, script, LAEL and offline-cache URLs. The new stylesheet and metadata generator use that same build pipeline.
- Self-hosted fonts, responsive images, service-worker caching, navigation, demos, gallery controls, project intake, WhatsApp, email and phone routes remain.
- The four-step enquiry form still submits to the existing Formspree endpoint. No live enquiry was sent during testing.
- LAEL still lazy-loads and uses the configured Cloudflare Worker, with its existing local guide fallback, safe link renderer and optional voice controls. Voice remains off by default and microphone access remains explicit.
- The Worker and its configuration are unchanged. Server-side credential handling, origin checks, input/output bounds, rate limiting and request timeout remain. No PHP, database or database credentials are part of this architecture.
- No new dependency was added. Node.js 24 LTS is now used in CI, and the package engine floor matches the existing tooling requirements. Existing pinned development dependencies are retained.

## Design and rendering

- Tighter headline sizing, section rhythm and mobile button/card layouts retain the existing content and distinctive brand identity.
- The hero network now links to the relevant service sections. Layered rings, gentle existing parallax and quieter card details add depth without a WebGL runtime.
- Hero copy remains stationary for readability. Scroll progress uses a transform, layout measurements are cached or batched, and decorative animations pause outside the viewport and when the document is hidden.
- Existing motion cleanup and reduced-motion behavior are preserved. An unnecessary large rendering layer was removed.
- Captured at the same viewport widths, the home page is about 7% shorter on desktop and 8% shorter on a 390 px phone.

## Interaction and accessibility

- Keyboard skip links, active navigation semantics and a usable no-JavaScript mobile menu are available across the published pages.
- A contextual LAEL action connects the architecture section to the assistant. Failed or stalled lazy loads now have a deadline and retry path, with stale attempts prevented from creating duplicate launchers.
- The project form has clearer step progress, autocomplete, a privacy link and a spam honeypot. Without JavaScript, all steps remain visible for native submission.
- Form success requires both a successful HTTP response and Formspree's explicit success result. False-success or malformed replies retain entered values and allow retry.
- Four concise service FAQs use native accessible disclosure controls.

## SEO and machine-readable content

- A build-time generator produces consistent canonical and social URLs using the domain in `CNAME`, with branded share and favicon assets.
- Organization, WebSite, WebPage, breadcrumb and service schema use existing public business information. FAQ schema is derived from the visible FAQ content.
- Metadata remains descriptive and grounded in the published site. No fabricated reviews, locations or ratings were added.
- The sitemap uses the canonical `www` domain and lists only indexable root pages. Crawlers can access `noindex` pages to see their directives.
- Nested missing URLs render the 404 page with root-relative assets and navigation. The preview server also handles malformed URL encodings without crashing.

## Validation

All checks below passed for the final implementation before publishing the release branch. GitHub Actions repeats the complete quality suite and Lighthouse gate on the pull request and on `main`.

| Check | Result |
| --- | --- |
| Build, ESLint, Stylelint, asset/metadata/internal-link budgets | Passed |
| Worker tests | 6 passed |
| LAEL browser regression checks | 185 assertions passed |
| Site interaction regression checks | 286 assertions passed |
| Responsive sweep | All 15 root pages at 320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1440, 1920 and 2560 px |
| Local mobile Lighthouse performance | 94 |
| Lighthouse accessibility / best practices / SEO | 100 / 100 / 100 |
| Largest contentful paint | 1.77 s |
| Cumulative layout shift | 0 |
| Total blocking time | 151 ms |
| Tracked credential pattern scan | No credentials detected; local secret files are ignored |

Browser regressions cover rapid scroll jumps and reversals, wheel/keyboard/scrollbar/touch emulation, resize and loading behavior, reduced motion, fragment navigation, lifecycle recovery, offline caching, nested 404s, form validation and mocked recovery, assistant loading races, safe links, malformed responses and microphone/speech cleanup. Production LAEL answered service and contact questions through its configured endpoint during the live audit.

These are lab measurements using Chromium, not field Core Web Vitals or physical Android/iPhone measurements. Performance scores vary with the test machine and run. Form delivery is covered with controlled responses rather than an unsolicited real enquiry. Speech tests inspect browser utterances and lifecycle; physical audio playback and OS-specific voices require device verification. Schema improves content interpretation but does not guarantee search or AI-answer placement.

## Deployment and recovery

The release uses a dedicated branch, pull request and passing GitHub Actions checks before merging into the existing `main` deployment path. GitHub Pages and the Cloudflare integration retain their existing configuration. Verify the deployed page's versioned assets, navigation, FAQ, enquiry validation and LAEL after hosting completes.

The pre-release commit is `94350aaae6ce94cf239bd8edc7329bc660a82adc`, preserved as `checkpoint/sbm-before-premium-20261008`. To roll back, revert the merged release commit through a reviewed change and let the existing deployment run. A rollback does not require rewriting branch history or moving the custom domain.
