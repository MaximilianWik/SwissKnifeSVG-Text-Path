import { useRef, useState } from "react";
import { OUTLINE_D, OUTLINE_OFFSET } from "./outlinePath.js";

const SENTENCE =
  "Chaotic space of creativity & multidisciplinary ideas exploring the limits of the human curiosity.";

// ---- Defaults & limits ----------------------------------------------------
const LAP_DURATION_DEFAULT = 30;     // seconds per lap
const LAP_DURATION_MIN = 5;
const LAP_DURATION_MAX = 120;

const FONT_SIZE_DEFAULT = 33;
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 80;

const PATH_SCALE_DEFAULT = 1.0;
const PATH_SCALE_MIN = 0.4;
const PATH_SCALE_MAX = 1.4;

// ViewBox padding
const PAD = 60;
const CANVAS_W = 662;
const CANVAS_H = 636;

// Logo dimensions
const LOGO_NATIVE = { w: 673, h: 293 };
const LOGO_DEFAULT_WIDTH = 600;
const LOGO_MIN_WIDTH = 200;
const LOGO_MAX_WIDTH = 900;

// Text style
const TEXT_FONT =
  '"Cormorant Garamond", "EB Garamond", Georgia, "Times New Roman", serif';

const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap";

const TEXT_FILL = "#d30000";
const TEXT_LETTER_SPACING = 0.3;
const TEXT_FONT_WEIGHT = 500;

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUrl(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return blobToDataUrl(await r.blob());
}

// ---- GIF export helpers ---------------------------------------------------

const GIF_JS_VERSION = "0.2.0";
const GIF_WORKER_URL = `https://cdn.jsdelivr.net/npm/gif.js@${GIF_JS_VERSION}/dist/gif.worker.js`;

// Number of frames to capture across one full lap. 80 frames at lap=30s is
// 2.67 fps - playable; bump if you have a faster lap and want smoother motion.
const GIF_FRAME_COUNT = 80;

// GIF rendered width in pixels. Height is derived from the SVG's aspect ratio.
const GIF_OUTPUT_WIDTH = 600;

// Page background colour, painted under each frame so the result matches the
// app's look (SVG has no background of its own).
const GIF_BG = "#f4f1ec";

async function inlineFontsCss(stylesheetHref) {
  const cssText = await fetch(stylesheetHref).then((r) => r.text());
  // Find every url(...) reference; only fetch the woff2 ones - the browser
  // already negotiated those via its UA, so they're the ones the live page
  // is using.
  const urls = [
    ...cssText.matchAll(/url\(([^)]+)\)/g),
  ].map((m) => m[1].replace(/^['"]|['"]$/g, ""));
  const woff2 = [...new Set(urls.filter((u) => u.endsWith(".woff2")))];
  const replacements = await Promise.all(
    woff2.map(async (u) => [u, await fetchAsDataUrl(u)]),
  );
  let inlined = cssText;
  for (const [orig, dataUrl] of replacements) {
    inlined = inlined.split(orig).join(dataUrl);
  }
  return inlined;
}

async function loadWorkerBlobUrl() {
  const code = await fetch(GIF_WORKER_URL).then((r) => r.text());
  return URL.createObjectURL(
    new Blob([code], { type: "application/javascript" }),
  );
}

async function svgStringToImage(svgString) {
  const blob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } finally {
    // Keep the object URL alive until the image is decoded; revoking after
    // decode is safe because the bitmap is already in memory.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return img;
}

function buildFrameSvg({
  liveSvg,
  fontCss,
  logoDataUrl,
  silhouetteDataUrl,
  startOffsetA,
  startOffsetB,
  width,
  height,
}) {
  const clone = liveSvg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  // Strip the SMIL animations and bake static startOffsets so the rasteriser
  // captures the exact frame we want.
  clone.querySelectorAll("animate").forEach((a) => a.remove());
  const textPaths = clone.querySelectorAll("textPath");
  if (textPaths[0]) textPaths[0].setAttribute("startOffset", `${startOffsetA}%`);
  if (textPaths[1]) textPaths[1].setAttribute("startOffset", `${startOffsetB}%`);

  // Replace external image references with inlined data URLs so the SVG
  // renders without further network fetches (and stays untainted on canvas).
  clone.querySelectorAll("image").forEach((imgEl) => {
    const href =
      imgEl.getAttribute("href") || imgEl.getAttribute("xlink:href") || "";
    if (href.endsWith("LogoText.png")) {
      imgEl.setAttribute("href", logoDataUrl);
      imgEl.removeAttribute("xlink:href");
    } else if (href.endsWith("swiss-knife.png")) {
      imgEl.setAttribute("href", silhouetteDataUrl);
      imgEl.removeAttribute("xlink:href");
    }
  });

  // Inject the font CSS (with woff2 inlined) so Cormorant Garamond renders
  // inside the standalone SVG image.
  const styleEl = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "style",
  );
  styleEl.textContent = fontCss;
  clone.insertBefore(styleEl, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

export default function App() {
  const [showGuides, setShowGuides] = useState(true);
  const [logoWidth, setLogoWidth] = useState(LOGO_DEFAULT_WIDTH);
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [pathScale, setPathScale] = useState(PATH_SCALE_DEFAULT);
  const [lapDurationSec, setLapDurationSec] = useState(LAP_DURATION_DEFAULT);
  const [exporting, setExporting] = useState(false);
  const [gifProgress, setGifProgress] = useState(null); // null | "frames i/N" | "encoding p%" 
  const svgRef = useRef(null);

  const logoHeight = logoWidth * (LOGO_NATIVE.h / LOGO_NATIVE.w);
  const logoX = (CANVAS_W - logoWidth) / 2;
  const logoY = (CANVAS_H - logoHeight) / 2;

  // Scale transform: keeps path-size and font-size independent
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  const scaleTransform = `translate(${cx} ${cy}) scale(${pathScale}) translate(${-cx} ${-cy})`;
  const innerFontSize = fontSize / pathScale;
  const innerLetterSpacing = TEXT_LETTER_SPACING / pathScale;

  const textStyle = {
    fontFamily: TEXT_FONT,
    fontSize: innerFontSize,
    fontWeight: TEXT_FONT_WEIGHT,
    fill: TEXT_FILL,
    letterSpacing: innerLetterSpacing,
  };

  async function handleExportGif() {
    if (typeof window === "undefined" || !window.GIF) {
      alert(
        "GIF encoder not loaded. The CDN script in index.html may be blocked - check the network tab.",
      );
      return;
    }
    setGifProgress("preparing...");
    try {
      const liveSvg = svgRef.current;
      if (!liveSvg) throw new Error("SVG element not available yet");

      const aspect =
        (CANVAS_H + PAD * 2) / (CANVAS_W + PAD * 2);
      const widthOut = GIF_OUTPUT_WIDTH;
      const heightOut = Math.round(widthOut * aspect);

      // Pre-fetch everything that's reused across frames.
      const [fontCss, logoDataUrl, silhouetteDataUrl, workerBlobUrl] =
        await Promise.all([
          inlineFontsCss(FONT_STYLESHEET),
          fetchAsDataUrl("/LogoText.png"),
          fetchAsDataUrl("/swiss-knife.png"),
          loadWorkerBlobUrl(),
        ]);

      const gif = new window.GIF({
        workers: 2,
        quality: 8,
        workerScript: workerBlobUrl,
        width: widthOut,
        height: heightOut,
        repeat: 0, // 0 = loop forever
        background: GIF_BG,
      });

      const canvas = document.createElement("canvas");
      canvas.width = widthOut;
      canvas.height = heightOut;
      const ctx = canvas.getContext("2d");
      const frameDelayMs = (lapDurationSec * 1000) / GIF_FRAME_COUNT;

      // Capture exactly GIF_FRAME_COUNT frames over [0, lapDurationSec).
      // The (N+1)-th frame would equal the 1st, so the loop is seamless.
      for (let i = 0; i < GIF_FRAME_COUNT; i++) {
        const phase = i / GIF_FRAME_COUNT;
        // Animation goes 100% -> 0% over one lap -> textPath A startOffset:
        const offsetA = (1 - phase) * 100;
        // textPath B is one full path-length behind, animating 0% -> -100%:
        const offsetB = -phase * 100;

        const xml = buildFrameSvg({
          liveSvg,
          fontCss,
          logoDataUrl,
          silhouetteDataUrl,
          startOffsetA: offsetA,
          startOffsetB: offsetB,
          width: widthOut,
          height: heightOut,
        });

        const img = await svgStringToImage(xml);
        ctx.fillStyle = GIF_BG;
        ctx.fillRect(0, 0, widthOut, heightOut);
        ctx.drawImage(img, 0, 0, widthOut, heightOut);

        gif.addFrame(ctx, { copy: true, delay: frameDelayMs });
        setGifProgress(`frame ${i + 1}/${GIF_FRAME_COUNT}`);
        // Yield to the event loop so React can repaint the progress text.
        await new Promise((res) => setTimeout(res, 0));
      }

      setGifProgress("encoding 0%");
      gif.on("progress", (p) => {
        setGifProgress(`encoding ${Math.round(p * 100)}%`);
      });

      const blob = await new Promise((resolve, reject) => {
        gif.on("finished", resolve);
        gif.on("abort", () => reject(new Error("GIF render aborted")));
        gif.render();
      });

      URL.revokeObjectURL(workerBlobUrl);

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `swiss-knife-textpath-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.gif`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("GIF export failed:", err);
      alert("GIF export failed: " + (err?.message ?? err));
    } finally {
      setGifProgress(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const [logoDataUrl, silhouetteDataUrl] = await Promise.all([
        fetchAsDataUrl("/LogoText.png"),
        fetchAsDataUrl("/swiss-knife.png"),
      ]);

      const settings = {
        sentence: SENTENCE,
        fontFamily: TEXT_FONT,
        fontSize,
        fontWeight: TEXT_FONT_WEIGHT,
        letterSpacing: TEXT_LETTER_SPACING,
        fillColor: TEXT_FILL,
        lapDurationSeconds: lapDurationSec,
        pathScale,
        viewBoxPadding: PAD,
        canvasWidth: CANVAS_W,
        canvasHeight: CANVAS_H,
        logo: {
          width: round2(logoWidth),
          height: round2(logoHeight),
          x: round2(logoX),
          y: round2(logoY),
          nativeWidth: LOGO_NATIVE.w,
          nativeHeight: LOGO_NATIVE.h,
        },
        showGuides,
        guides: {
          referenceImageOpacity: 0.08,
          pathStrokeColor: "#1a1a1a",
          pathStrokeOpacity: 0.18,
          pathStrokeWidth: 0.6,
        },
      };

      const componentSource = buildComponentSource({
        settings,
        path: { d: OUTLINE_D, translate: OUTLINE_OFFSET },
        logoDataUrl,
        silhouetteDataUrl,
      });

      const config = {
        _readme:
          "Self-contained spec for the swiss-knife-textpath React artefact. Paste the entire file into an AI assistant in your other project; the assistant should follow `promptForAI` to recreate the component exactly. All assets are embedded as base64 data URLs so no separate files are needed.",
        promptForAI:
          "Create a React + Vite project (or use my existing one) and replicate the swiss-knife-textpath artefact described in this JSON. Two ways to do it:\n" +
          "  (A) FAST PATH: write the contents of `componentSource` verbatim to src/App.jsx (it is fully self-contained - path data and both image assets are inlined as data URLs). Add a <link rel=\"stylesheet\" href=\"<fontStylesheetHref>\"> in index.html. Done.\n" +
          "  (B) STRUCTURED PATH: build the component from `settings`, `path`, and `assets`. Render an SVG with viewBox = `-padding -padding (canvasWidth+2*padding) (canvasHeight+2*padding)`. Define <path id=\"knife-outline\" d={path.d}/> in <defs>. Wrap path-related content in an outer <g> with transform `translate(cx cy) scale(pathScale) translate(-cx -cy)` (where cx=canvasWidth/2, cy=canvasHeight/2). Inside, render the optional faint reference <image> (assets.silhouette.dataUrl, opacity guides.referenceImageOpacity), then a <g transform=\"translate(path.translate.x, path.translate.y)\"> containing: a subtle <use> stroke (gated by showGuides) and two <text> elements each containing <textPath href=\"#knife-outline\">. Important: divide the text element's fontSize and letterSpacing by pathScale before applying them, so the outer scale multiplies them back up to the user's chosen values (path-size and font-size stay independent). The first textPath has startOffset=\"100%\" with <animate> 100%->0%, the second startOffset=\"0%\" with <animate> 0%->-100%. Both <animate> share dur=\"<lapDurationSeconds>s\", repeatCount=indefinite, and the second animate's begin attribute references the first's id (begin=\"lap.begin\") to keep them locked. After the outer scaled <g>, render the logo <image> (assets.logo.dataUrl, x/y/width/height from settings.logo) - it is NOT inside the scaled group so it stays at its own size.\n" +
          "Either way, the result must visually match an SVG that animates a single sentence ('Chaotic space of creativity...') circling the swiss-army-knife silhouette in red Cormorant Garamond, with the logo image overlaid in the centre.",
        kind: "swiss-knife-textpath",
        version: 2,
        createdAt: new Date().toISOString(),
        fontStylesheetHref: FONT_STYLESHEET,
        settings,
        path: { d: OUTLINE_D, translate: OUTLINE_OFFSET },
        assets: {
          logo: {
            filename: "LogoText.png",
            mimeType: "image/png",
            dataUrl: logoDataUrl,
          },
          silhouette: {
            filename: "swiss-knife.png",
            mimeType: "image/png",
            dataUrl: silhouetteDataUrl,
          },
        },
        componentSource,
        indexHtmlSnippet:
          `<link rel="preconnect" href="https://fonts.googleapis.com" />\n` +
          `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n` +
          `<link href="${FONT_STYLESHEET}" rel="stylesheet" />`,
      };

      const json = JSON.stringify(config, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `swiss-knife-textpath-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed: " + (err?.message ?? err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 10,
          fontFamily: TEXT_FONT,
          fontSize: 16,
          color: "#222",
          userSelect: "none",
          minWidth: 280,
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showGuides}
            onChange={(e) => setShowGuides(e.target.checked)}
          />
          Show silhouette &amp; outline
        </label>

        <Slider
          label="Logo size"
          min={LOGO_MIN_WIDTH}
          max={LOGO_MAX_WIDTH}
          step={5}
          value={logoWidth}
          onChange={setLogoWidth}
          format={(v) => Math.round(v)}
        />

        <Slider
          label="Path size"
          min={PATH_SCALE_MIN}
          max={PATH_SCALE_MAX}
          step={0.01}
          value={pathScale}
          onChange={setPathScale}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        <Slider
          label="Font size"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          value={fontSize}
          onChange={setFontSize}
          format={(v) => `${Math.round(v)}px`}
        />

        <Slider
          label="Lap speed"
          min={LAP_DURATION_MIN}
          max={LAP_DURATION_MAX}
          step={1}
          value={lapDurationSec}
          onChange={setLapDurationSec}
          format={(v) => `${Math.round(v)}s/lap`}
        />

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          style={{
            fontFamily: TEXT_FONT,
            fontSize: 16,
            padding: "8px 14px",
            border: "1px solid #1a1a1a",
            borderRadius: 4,
            background: exporting ? "#eee" : "#fff",
            cursor: exporting ? "wait" : "pointer",
            marginTop: 4,
          }}
        >
          {exporting ? "Exporting..." : "Export current state"}
        </button>

        <button
          type="button"
          onClick={handleExportGif}
          disabled={gifProgress !== null}
          style={{
            fontFamily: TEXT_FONT,
            fontSize: 16,
            padding: "8px 14px",
            border: "1px solid #d30000",
            borderRadius: 4,
            background: gifProgress !== null ? "#fcebeb" : "#fff",
            color: "#d30000",
            cursor: gifProgress !== null ? "wait" : "pointer",
          }}
        >
          {gifProgress !== null
            ? `Exporting GIF: ${gifProgress}`
            : "Export GIF (one lap)"}
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`-${PAD} -${PAD} ${CANVAS_W + PAD * 2} ${CANVAS_H + PAD * 2}`}
        width="min(95vw, 980px)"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Swiss-army knife outlined by a sentence about creativity and curiosity, looping continuously around the silhouette"
      >
        <defs>
          <path id="knife-outline" d={OUTLINE_D} />
        </defs>

        <g transform={scaleTransform}>
          {showGuides && (
            <image
              href="/swiss-knife.png"
              width={CANVAS_W}
              height={CANVAS_H}
              opacity="0.08"
            />
          )}

          <g transform={`translate(${OUTLINE_OFFSET.x}, ${OUTLINE_OFFSET.y})`}>
            {showGuides && (
              <use
                href="#knife-outline"
                fill="none"
                stroke="#1a1a1a"
                strokeOpacity="0.18"
                strokeWidth={0.6 / pathScale}
              />
            )}

            <text {...textStyle}>
              <textPath href="#knife-outline" startOffset="100%">
                <animate
                  id="lap"
                  attributeName="startOffset"
                  from="100%"
                  to="0%"
                  dur={`${lapDurationSec}s`}
                  repeatCount="indefinite"
                />
                {SENTENCE}
              </textPath>
            </text>

            <text {...textStyle}>
              <textPath href="#knife-outline" startOffset="0%">
                <animate
                  attributeName="startOffset"
                  from="0%"
                  to="-100%"
                  dur={`${lapDurationSec}s`}
                  repeatCount="indefinite"
                  begin="lap.begin"
                />
                {SENTENCE}
              </textPath>
            </text>
          </g>
        </g>

        {/* Logo overlay */}
        <image
          href="/LogoText.png"
          x={logoX}
          y={logoY}
          width={logoWidth}
          height={logoHeight}
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange, format }) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 64, textAlign: "right" }}>
        {format ? format(value) : value}
      </span>
    </label>
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Export: builds a self-contained App.jsx with inlined assets
function buildComponentSource({ settings, path, logoDataUrl, silhouetteDataUrl }) {
  return `import { useState } from "react";

// Self-contained component. All assets inlined as data URLs.
// Add the Google Fonts <link> from indexHtmlSnippet to your index.html.

const SENTENCE = ${JSON.stringify(settings.sentence)};
const LAP_DURATION_SEC = ${settings.lapDurationSeconds};
const PAD = ${settings.viewBoxPadding};
const CANVAS_W = ${settings.canvasWidth};
const CANVAS_H = ${settings.canvasHeight};
const PATH_SCALE = ${settings.pathScale};

const TEXT_FONT = ${JSON.stringify(settings.fontFamily)};
const USER_FONT_SIZE = ${settings.fontSize};
const USER_LETTER_SPACING = ${settings.letterSpacing};

// Compensate for the outer scale so user-facing font/letter values stay constant.
const INNER_FONT_SIZE = USER_FONT_SIZE / PATH_SCALE;
const INNER_LETTER_SPACING = USER_LETTER_SPACING / PATH_SCALE;

const TEXT_STYLE = {
  fontFamily: TEXT_FONT,
  fontSize: INNER_FONT_SIZE,
  fontWeight: ${settings.fontWeight},
  fill: ${JSON.stringify(settings.fillColor)},
  letterSpacing: INNER_LETTER_SPACING,
};

const OUTLINE_D = ${JSON.stringify(path.d)};
const OUTLINE_OFFSET = ${JSON.stringify(path.translate)};

const LOGO_DATA_URL = ${JSON.stringify(logoDataUrl)};
const SILHOUETTE_DATA_URL = ${JSON.stringify(silhouetteDataUrl)};

const LOGO = ${JSON.stringify(settings.logo, null, 2)};

export default function App() {
  const [showGuides, setShowGuides] = useState(${settings.showGuides});

  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  const scaleTransform = \`translate(\${cx} \${cy}) scale(\${PATH_SCALE}) translate(\${-cx} \${-cy})\`;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", position: "relative" }}>
      <label style={{ position: "absolute", top: 20, right: 24, fontFamily: TEXT_FONT, fontSize: 16, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
        Show silhouette &amp; outline
      </label>

      <svg
        viewBox={\`-\${PAD} -\${PAD} \${CANVAS_W + PAD * 2} \${CANVAS_H + PAD * 2}\`}
        width="min(95vw, 980px)"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <path id="knife-outline" d={OUTLINE_D} />
        </defs>

        <g transform={scaleTransform}>
          {showGuides && (
            <image href={SILHOUETTE_DATA_URL} width={CANVAS_W} height={CANVAS_H} opacity="${settings.guides.referenceImageOpacity}" />
          )}

          <g transform={\`translate(\${OUTLINE_OFFSET.x}, \${OUTLINE_OFFSET.y})\`}>
            {showGuides && (
              <use
                href="#knife-outline"
                fill="none"
                stroke="${settings.guides.pathStrokeColor}"
                strokeOpacity="${settings.guides.pathStrokeOpacity}"
                strokeWidth={${settings.guides.pathStrokeWidth} / PATH_SCALE}
              />
            )}

            <text {...TEXT_STYLE}>
              <textPath href="#knife-outline" startOffset="100%">
                <animate
                  id="lap"
                  attributeName="startOffset"
                  from="100%"
                  to="0%"
                  dur={\`\${LAP_DURATION_SEC}s\`}
                  repeatCount="indefinite"
                />
                {SENTENCE}
              </textPath>
            </text>

            <text {...TEXT_STYLE}>
              <textPath href="#knife-outline" startOffset="0%">
                <animate
                  attributeName="startOffset"
                  from="0%"
                  to="-100%"
                  dur={\`\${LAP_DURATION_SEC}s\`}
                  repeatCount="indefinite"
                  begin="lap.begin"
                />
                {SENTENCE}
              </textPath>
            </text>
          </g>
        </g>

        <image
          href={LOGO_DATA_URL}
          x={LOGO.x}
          y={LOGO.y}
          width={LOGO.width}
          height={LOGO.height}
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    </div>
  );
}
`;
}



