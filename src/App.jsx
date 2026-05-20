import { useState } from "react";
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

// Padding around the 662x636 silhouette so glyphs that stick out
// perpendicular to the path don't clip on the viewBox edges.
const PAD = 60;
const CANVAS_W = 662;
const CANVAS_H = 636;

// LogoText.png is 673x293 native. Default render width is roughly the
// inner-body width of the knife; user can resize live via the slider.
const LOGO_NATIVE = { w: 673, h: 293 };
const LOGO_DEFAULT_WIDTH = 600;
const LOGO_MIN_WIDTH = 200;
const LOGO_MAX_WIDTH = 900;

// Cormorant Garamond is a refined, high-contrast serif with strong x-height
// and round terminals; it stays legible at 33 px on a curving textPath.
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

export default function App() {
  const [showGuides, setShowGuides] = useState(true);
  const [logoWidth, setLogoWidth] = useState(LOGO_DEFAULT_WIDTH);
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [pathScale, setPathScale] = useState(PATH_SCALE_DEFAULT);
  const [lapDurationSec, setLapDurationSec] = useState(LAP_DURATION_DEFAULT);
  const [exporting, setExporting] = useState(false);

  const logoHeight = logoWidth * (LOGO_NATIVE.h / LOGO_NATIVE.w);
  const logoX = (CANVAS_W - logoWidth) / 2;
  const logoY = (CANVAS_H - logoHeight) / 2;

  // The path-scale group wraps everything path-related (silhouette image,
  // outline stroke, both text elements) so the path scales around the
  // canvas centre. Font size and letter spacing are divided by the scale
  // inside the group so the outer scale multiplies them back to the user's
  // chosen values - that way "Path size" and "Font size" are independent.
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
      </div>

      <svg
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

        {/* Logo overlay - rendered last so it sits above the moving text.
            Outside the scaled group so its size is independent. */}
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

// ---------------------------------------------------------------------------
// Self-contained source generator.
//
// Emits a single App.jsx that has the path data and both image assets inlined
// as data URLs, so the receiving project does not need any external files
// beyond the Google Fonts <link>. Reflects the live values of all sliders.
// ---------------------------------------------------------------------------
function buildComponentSource({ settings, path, logoDataUrl, silhouetteDataUrl }) {
  return `import { useState } from "react";

// === Generated by swiss-knife-textpath export ===============================
// All assets and path data are inlined as data URLs / literals, so this file
// is fully self-contained. Drop it in as src/App.jsx and add the Google
// Fonts <link> to index.html (see indexHtmlSnippet in the spec JSON).
// ============================================================================

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
