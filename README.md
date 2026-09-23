# SBM ConTech Industries Website

Official website for **SBM ConTech Industries**, a South African technology company focused on digital systems, AI automation and connected infrastructure.

**Live site:** [www.sbmcontech.co.za](https://www.sbmcontech.co.za)

## Website structure

- Home
- Solutions
- Work and system demonstrations
- Company
- Industries
- Insights
- Project scoping and contact
- Privacy and terms

## Lael assistant

The small "Ask Lael" launcher appears across the current website after the main page finishes loading; the full assistant loads only when a visitor opens it. Visitors can ask about SBM's services, project intake, and contact routes; open relevant site pages; choose a speaking style and an English voice available on their own device; and use push-to-talk when their browser supports speech recognition. Voice replies are **off by default**. The microphone starts only when a visitor presses its button. The browser may use its own speech service to transcribe audio. Text chat remains usable without voice support.

The website's built-in site guide works immediately, without a server or API key. It gives grounded answers from the approved SBM service and contact information in `lael.js`. It does not invent prices or accept bookings. Questions and answers stay in the current page and are not saved by the site guide.

An optional AI endpoint is included in `worker/`. The static GitHub Pages site cannot safely hold an API key, so AI replies require a separately deployed Cloudflare Worker and an OpenAI API account. The Worker limits input length, caps output, applies a per-IP rate limit, restricts browser origins to the SBM domains, and uses `store: false`. It does not persist chat history. Browser origin checks alone are not authentication; monitor API usage and keep spending limits on the provider account before activating a public endpoint.

To activate AI replies after reviewing costs and the privacy wording:

1. Deploy `worker/` from a Cloudflare account using its `wrangler.toml`. Set `OPENAI_API_KEY` as a **Worker secret**, never in the website, GitHub, or `lael-config.json`. The optional `OPENAI_MODEL` variable is set in the Worker config.
2. Verify `POST https://<your-worker-domain>/chat` with a permitted SBM `Origin` header. The Worker needs the `LAEL_RATE_LIMITER` binding in `wrangler.toml`.
3. Put the deployed `https://<your-worker-domain>/chat` URL in `lael-config.json` and run `npm run build`. Publish the site through the existing review and deploy process.

If the AI endpoint is unavailable, Lael says so and continues with its local site guide. Device voices vary by browser and operating system; the three speaking styles adjust delivery and do not create new synthetic voice identities.

The primary navigation is intentionally limited to five clear actions. Industries, Insights and SBM Labs remain available through the footer and contextual links.

## Performance and mobile update

The August 2026 optimization preserved the existing visual identity and page structure while adding:

- minified production HTML, CSS and JavaScript;
- responsive WebP images with explicit dimensions;
- lazy loading and asynchronous image decoding;
- self-hosted fonts;
- deferred non-essential motion and scripts;
- service-worker caching for repeat visits;
- Flexbox/Grid responsive refinements using relative units;
- 44 px-equivalent touch targets and visible keyboard focus;
- 16 px minimum form controls and long-word wrapping;
- touchscreen-safe content that does not depend on hover;
- a simplified five-link primary navigation;
- removal of the former CEO and CFO profiles and image assets.

Measured with the same local mobile Lighthouse profile:

| Metric | Before | After |
| --- | ---: | ---: |
| Performance | 74 | 99 |
| Accessibility | 94 | 100 |
| Best Practices | 96 | 100 |
| SEO | 100 | 100 |
| Largest Contentful Paint | 12.2 s | 1.5 s |
| Cumulative Layout Shift | 0 | 0 |
| Initial transfer | 2,185 KiB | 80 KiB |

See [MOBILE-PERFORMANCE-UPDATE.md](MOBILE-PERFORMANCE-UPDATE.md) for the detailed change and measurement record.

## Local development

Requirements:

- Node.js 20 or newer
- Google Chrome or Chromium for responsive and Lighthouse checks

```bash
npm ci
npm run preview
```

The preview server runs the production-style site locally with compression, cache headers and ETags.

## Build and quality checks

```bash
npm run build
npm run lint
npm run test:performance
npm run test:responsive
npm run lighthouse:ci
```

Run the main non-Lighthouse quality suite with:

```bash
npm run quality
```

The project uses ESLint, Stylelint, responsive browser testing, asset and internal-link budgets, and Lighthouse CI. GitHub Actions executes these checks on pull requests and changes to `main`.

Production builds recreate `dist/` from scratch, preventing obsolete files from remaining after a page or asset is removed.

## Deployment

The site is deployed through GitHub Pages from the `main` branch and uses the custom domain defined in `CNAME`. Changes should be made in a branch, validated by GitHub Actions, reviewed through a pull request, and merged only after all checks pass.

## Repository notes

- `styles/sbm-1.css` through `styles/sbm-5.css` are the source styles.
- `style.min.css` and `script.min.js` are generated production assets.
- `scripts/build.mjs` creates the clean deployable `dist/` output.
- `sw.js` controls the versioned browser cache.
- `.github/workflows/quality.yml` defines the automated quality gate.
