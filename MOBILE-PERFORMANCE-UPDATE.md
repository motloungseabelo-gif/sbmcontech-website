# SBM ConTech Industries — Mobile Performance + 3-D Scroll Update

## What changed
- Preserved the existing site structure, pages, content, navigation, project form, smart-living demo, and cinematic visual language.
- Added a lightweight, dependency-free 3-D scroll simulator using perspective, scroll position, velocity, and foreground/background counter-motion.
- 3-D calculations run only for elements in or near the viewport using IntersectionObserver + requestAnimationFrame.
- Mobile uses reduced motion intensity and removes expensive backdrop/entry blur effects.
- Data Saver and lower-memory devices automatically use a lighter animation profile.
- `prefers-reduced-motion` is respected and disables depth animation where appropriate.
- Pointer tilt remains desktop/fine-pointer only.
- Scroll progress rendering is requestAnimationFrame-throttled.
- Shared JavaScript is deferred.
- Non-critical images use lazy loading and async decoding.
- Main logo asset was optimized while keeping its existing public path.
- Large secondary brand artwork was replaced with a much smaller optimized asset.

## Verification performed
- `node --check script.js` passes.
- All 15 HTML pages served successfully over a local HTTP server.
- No missing local href/src references were found.
- CSS braces are balanced.

## Deployment
Upload the contents of this folder the same way as the previous static deployment. CNAME, robots.txt, sitemap.xml, and existing page filenames remain in place.
