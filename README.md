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
