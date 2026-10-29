# SBM ConTech Industries

The public SBM website: **https://www.sbmcontech.co.za/**.

A calm, concise website for a South African business working across software, AI automation and connected infrastructure. Warm white, navy and bronze carry the SBM identity; a custom emblem and real infrastructure photography support the design.

## Develop and build

Use Node.js 24 (minimum 22.13) and npm.

```sh
npm ci
npm run build
npm run preview
```

Open the preview URL printed by the server. GitHub Pages serves the tracked repository root from `main`. `CNAME` retains `www.sbmcontech.co.za`. The build writes root HTML and optimized assets, plus a clean `dist/` copy. The root files must be committed with source changes.

- `scripts/pages.mjs`: page content, titles and descriptions.
- `scripts/layout.mjs`: shared navigation, footer, social tags and linked structured data.
- `styles/site.css`: responsive layout, with breakpoints at 360, 760, 900, 1100 and 1600 px.
- `script.js`: menu, consent, enquiries, prototype controls and lazy LAEL loader.
- `site.config.json`: verified business details and analytics configuration.
- `images/redesign/`: new logo, favicons, Open Graph image and responsive real photographs.

Run `npm run build` after edits. Minified files and HTML use a shared content-derived release identifier. The old service worker is retired and clears SBM’s previous offline caches to prevent stale pages.

## Enquiries

The existing Formspree endpoint is preserved. The shorter form has field-specific errors, an explicit privacy checkbox, a honeypot, duplicate-submission protection, a sending state and a 20-second deadline. Failure preserves entered values. Only an accepted `{ "ok": true }` response navigates to the thank-you page; a direct thank-you visit does not assert delivery. Without JavaScript, normal HTML form submission and provider-side validation remain available.

Tests intercept all form requests; no test sends an actual enquiry. Delivery into the business mailbox and third-party account limits are not proven by mocked tests.

## Analytics and cookie preferences

**GA4 is prepared but inactive**, as requested. No Measurement ID was supplied. To activate, add the real public `G-...` property ID in `site.config.json`, update the privacy and cookie notices to describe the live setup, rebuild and publish. Do not place API secrets in this static repository.

A valid property and explicit visitor opt-in are both required before the Google script loads. Advertising consent stays denied. Our configured page view omits query strings and referrers; our lead event sends no enquiry text, name or email. Turn off unwanted enhanced measurement, Google Signals and advertising links in the GA property. Verify provider settings before enabling collection. Rejecting removes accessible analytics cookies and reloads if the script was loaded. Preferences expire after approximately six months. Footer settings can reopen the banner at any time.

## Contact and location

Public email: sbmcontechindustries@gmail.com. Public business number: +27 64 026 2150. The owner chose to publish **South Africa only**. No street address or map coordinates are invented.

## Search, sharing and AI discovery

Each page has its own title, description, canonical URL, Open Graph and Twitter metadata. Linked Organization, WebSite, WebPage, Breadcrumb and Service entities describe the visible content; solution FAQs match the page. Country metadata uses ZA. Favicons, a web manifest, `robots.txt` and an indexable-page sitemap are included. Error, confirmation and legacy pages are `noindex`.

`llms.txt` is an optional factual reference for systems that read it. Google does not use special AI tags or this file as a ranking mechanism. Discoverability comes from crawlable content, correct company identity, internal links, structured metadata and a good page experience. Google chooses its own result titles and snippets and needs time to recrawl. See [Google’s guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## LAEL

The established assistant, safe link renderer and Cloudflare backend remain. Its CSS and JavaScript load when a visitor opens LAEL. The configuration remains in `lael-config.json`; the existing Worker in `worker/src/index.js` is a separate deployment and is not changed by publishing the website. Voice and microphone remain optional. The local guide is available when the AI connection is unavailable. No API keys belong in browser files.

## Checks

```sh
npm run quality
npm run test:browser
npm run lighthouse:ci
```

`quality` builds the 16 pages, checks titles, descriptions, images, local links, fragments, metadata, sitemap and transfer budgets, then runs Worker security/failure tests. `test:browser` uses installed Chrome (`CHROME_PATH` may override the path) for seven viewport widths, rapid scrolling, mobile navigation, enquiry validation and mocked submission states, prototype controls, nested 404 paths, consent and tracking revocation, plus LAEL’s renderer/voice/fallback regression suite.

GitHub Actions runs these checks and a mobile Lighthouse audit of Home, Solutions and Contact. The performance gate is **98/100**, accessibility **98/100**, SEO **98/100**, with explicit LCP and layout-shift limits. Reports are uploaded as `sbm-lighthouse-reports`; the actual scores appear in the workflow summary. Lab scores vary with hardware, network and third-party providers; a passing CI result is not a guarantee of every visitor’s experience.

Production recovery checkpoint: `checkpoint/sbm-before-redesign-20261029` (commit `82493dbd2b3258116c7963c76a56220f010e1c4a`).

See [brand and photo notes](docs/BRAND-ASSETS.md).
