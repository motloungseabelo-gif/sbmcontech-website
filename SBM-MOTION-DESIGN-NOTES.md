# SBM ConTech Industries — Cinematic Motion Design

This build adds a distinct SBM motion language without introducing a framework or external animation dependency.

## Added
- Royal navy + bronze SBM visual identity layer.
- Layered leadership portraits using duplicated depth layers, geometric masks and foreground/background motion.
- Scroll-driven parallax on hero, system diagrams, work previews, brand imagery and leadership portraits.
- Pointer-based perspective tilt on desktop for selected interactive surfaces.
- Cinematic section reveals using clip masks, fade, blur and directional movement.
- Page-to-page wipe transition for local HTML navigation.
- Custom engineered timing curves using CSS cubic-bezier variables.
- Animated grid, scan and depth treatments in the home hero.
- Reduced-motion and mobile fallbacks to keep the experience accessible and performant.

## Motion controls
The main timing values live in `style.css` under `SBM CINEMATIC MOTION SYSTEM`:
- `--motion-fast`
- `--motion-mid`
- `--motion-slow`
- `--ease-cine`
- `--ease-mech`

The scroll/pointer system lives at the bottom of `script.js` under `SBM Cinematic Motion System`.

## Deployment
This remains a static HTML/CSS/JavaScript site. It can be deployed the same way as the prior build on GitHub Pages or any static host.
