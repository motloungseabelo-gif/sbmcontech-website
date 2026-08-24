# SBM ConTech Industries — Mobile and Performance Update

## Measured result

Mobile Lighthouse was run before and after the update with the same throttled test profile.

| Metric | Before | After |
| --- | ---: | ---: |
| Performance | 74 | 99 |
| Accessibility | 94 | 100 |
| Best Practices | 96 | 100 |
| SEO | 100 | 100 |
| First Contentful Paint | 1.4 s | 0.8 s |
| Largest Contentful Paint | 12.2 s | 1.5 s |
| Total Blocking Time | 0 ms | 0 ms |
| Cumulative Layout Shift | 0 | 0 |
| Initial transfer | 2,185 KiB | 80 KiB |
| Initial requests | 9 | 6 |

## What changed

- Preserved the existing pages, visual identity, project form, smart-living demo and 3-D design language.
- Simplified the primary navigation to Home, Solutions, Work, Company and Start a Project. Industries and Insights remain available in the footer and internal links.
- Removed the former CEO and CFO profiles and their public image assets. The Company page now presents the founder only.
- Replaced the 2.1 MB page logo with responsive WebP variants from 1.9 KB to 20.9 KB.
- Converted the founder portrait to responsive WebP variants.
- Self-hosted variable DM Sans and Space Grotesk fonts, removing the render-blocking Google Fonts request.
- Consolidated five CSS requests into one minified stylesheet and minified the shared JavaScript.
- Deferred the non-essential 3-D motion boot until browser idle time and delayed 3-D calculations until scrolling begins.
- Kept non-critical images lazy-loaded with async decoding, explicit dimensions and low fetch priority.
- Added a versioned service-worker cache for repeat visits and offline resilience.
- Added responsive Flexbox/Grid overrides with relative `rem`, `%`, `vw` and `clamp()` sizing.
- Added 44 px-equivalent minimum touch targets, visible keyboard focus, 16 px form inputs and long-word wrapping.
- Removed hover-only dependence on touch devices while retaining desktop hover decoration.

## Automated quality controls

- ESLint validates JavaScript source and build/test scripts.
- Stylelint validates all source stylesheets.
- The performance-budget check validates all 15 HTML pages, local links, image dimensions, deferred external scripts, navigation size and asset byte limits.
- The responsive browser check covers 320, 412, 768 and 1024 pixel viewports across Home, Company, Contact and SBM Labs.
- Lighthouse CI enforces at least 90 for Performance, Accessibility, Best Practices and SEO, an LCP below 2.5 seconds and CLS below 0.1.
- GitHub Actions runs the complete quality suite on pull requests and pushes to `main`.

## Development commands

```bash
npm ci
npm run quality
npm run lighthouse:ci
npm run preview
```

The CNAME, robots.txt, sitemap.xml and public page filenames remain unchanged.
