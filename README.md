# SwissKnifeSVG-Text-Path

A live SVG text-path animation tool built for [Studio-Panic-Attack](https://github.com/MaximilianWik/Studio-Panic-Attack) — the art portfolio of Ema Stoyanova.

**Live:** [swiss-knife-svg-text-path.vercel.app](https://swiss-knife-svg-text-path.vercel.app/)

## What it does

Animates a sentence along the outline of a swiss-army knife silhouette using SVG `<textPath>`. The sentence loops continuously around the path in red Cormorant Garamond.

The tool provides live controls for:
- Path scale
- Font size
- Animation speed (seconds per lap)
- Logo overlay size
- Silhouette/outline visibility toggle

It also exports a self-contained JSON spec (with embedded base64 assets and a ready-to-paste React component) so the animation can be dropped into the mother project without any dependencies.

## Mother project

This exists solely as a design utility for **Studio-Panic-Attack** — Ema Stoyanova's portfolio site showcasing her work in art, 3D modelling, interactive media technology, product & brand design, UX/UI, photography, projection mapping, campaigns, events, and creative projects.

## Stack

- React 18
- Vite 5
- Deployed on Vercel

## Run locally

```bash
npm install
npm run dev
```

## Export

Click "Export current state" to download a JSON file containing:
- All current slider values
- Path data (the knife outline)
- Both image assets as base64 data URLs
- A self-contained `componentSource` string (drop-in App.jsx)
- Integration instructions for recreating the component in another project

## Structure

```
src/
├── App.jsx          # Main component with controls + SVG + export
├── outlinePath.js   # SVG path data for the knife silhouette
├── main.jsx         # Entry point
└── index.css        # Minimal reset
public/
├── LogoText.png     # Logo overlay image
└── swiss-knife.png  # Reference silhouette image
```

## License

MIT
