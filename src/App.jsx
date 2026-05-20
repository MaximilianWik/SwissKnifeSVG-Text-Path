import { useState } from "react";
import { OUTLINE_D, OUTLINE_OFFSET } from "./outlinePath.js";

const SENTENCE =
  "Chaotic space of creativity & multidisciplinary ideas exploring the limits of the human curiosity.";

// Seconds for one full lap around the silhouette.
const LAP_DURATION_SEC = 30;

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

const TEXT_STYLE = {
  fontFamily: TEXT_FONT,
  fontSize: 33,
  fontWeight: 500,
  fill: "#d30000",
  letterSpacing: 0.3,
};

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
  const [exporting, setExporting] = useState(false);

  const logoHeight = logoWidth * (LOGO_NATIVE.h / LOGO_NATIVE.w);
  const logoX = (CANVAS_W - logoWidth) / 2;
  const logoY = (CANVAS_H - logoHeight) / 2;

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
        fontSize: TEXT_STYLE.fontSize,
        fontWeight: TEXT_STYLE.fontWeight,
        letterSpacing: TEXT_STYLE.letterSpacing,
        fillColor: TEXT_STYLE.fill,
        lapDurationSeconds: LAP_DURATION_SEC,
        viewBoxPadding: PAD,
        canvasWidth: CANVAS_W,
        canvasHeight: CANVAS_H,
        logo: {
          width: Math.round(logoWidth * 100) / 100,
          height: Math.round(logoHeight * 100) / 100,
          x: Math.round(logoX * 100) / 100,
          y: Math.round(logoY * 100) / 100,
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
          "  (B) STRUCTURED PATH: build the component from `settings`, `path`, and `assets`. Render an SVG with viewBox = `-padding -padding (canvasWidth+2*padding) (canvasHeight+2*padding)`. Define <path id=\"knife-outline\" d={path.d}/> in <defs>. Inside <g transform=\"translate(path.translate.x, path.translate.y)\">, render: optional faint reference <image> of `assets.silhouette.dataUrl` and a subtle <use> stroke (both gated by `settings.showGuides`); then two <text> elements each containing <textPath href=\"#knife-outline\"> with the full sentence. The first textPath has startOffset=\"100%\" and animates startOffset 100%->0%. The second has startOffset=\"0%\" and animates 0%->-100%. Both <animate> elements share dur=`settings.lapDurationSeconds`s, repeatCount=indefinite, and the second's begin attribute references the first animate's id (e.g., begin=\"lap.begin\") to keep them locked together. After the <g>, render the logo <image> with x/y/width/height from `settings.logo`. Wire up state for `showGuides` and a slider for the logo width. Apply text styling from `settings`.\n" +
          "Either way, the result must visually match an SVG that animates a single sentence ('Chaotic space of creativity...') circling the swiss-army-knife silhouette in red Cormorant Garamond, with the logo image overlaid in the centre.",
        kind: "swiss-knife-textpath",
        version: 1,
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
          alignItems: "flex-end",
          gap: 12,
          fontFamily: TEXT_FONT,
          fontSize: 16,
          color: "#222",
          userSelect: "none",
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

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>Logo size</span>
          <input
            type="range"
            min={LOGO_MIN_WIDTH}
            max={LOGO_MAX_WIDTH}
            step={5}
            value={logoWidth}
            onChange={(e) => setLogoWidth(Number(e.target.value))}
            style={{ width: 160 }}
          />
          <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 40 }}>
            {Math.round(logoWidth)}
          </span>
        </label>

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
              strokeWidth="0.6"
            />
          )}

          <text {...TEXT_STYLE}>
            <textPath href="#knife-outline" startOffset="100%">
              <animate
                id="lap"
                attributeName="startOffset"
                from="100%"
                to="0%"
                dur={`${LAP_DURATION_SEC}s`}
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
                dur={`${LAP_DURATION_SEC}s`}
                repeatCount="indefinite"
                begin="lap.begin"
              />
              {SENTENCE}
            </textPath>
          </text>
        </g>

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

// ---------------------------------------------------------------------------
// Self-contained source generator.
//
// Emits a single App.jsx that has the path data and both image assets inlined
// as data URLs, so the receiving project doesn't need any external files
// beyond the Google Fonts <link>.
// ---------------------------------------------------------------------------
function buildComponentSource({ settings, path, logoDataUrl, silhouetteDataUrl }) {
  const esc = (s) => String(s).replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const sentenceLit = JSON.stringify(settings.sentence);
  const fontFamilyLit = JSON.stringify(settings.fontFamily);
  return `import { useState } from "react";

// === Generated by swiss-knife-textpath export ===============================
// All assets and path data are inlined as data URLs / literals, so this file
// is fully self-contained. Just drop it in as src/App.jsx and add the
// Google Fonts <link> to index.html (see indexHtmlSnippet in the spec JSON).
// ============================================================================

const SENTENCE = ${sentenceLit};
const LAP_DURATION_SEC = ${settings.lapDurationSeconds};
const PAD = ${settings.viewBoxPadding};
const CANVAS_W = ${settings.canvasWidth};
const CANVAS_H = ${settings.canvasHeight};

const TEXT_FONT = ${fontFamilyLit};
const TEXT_STYLE = {
  fontFamily: TEXT_FONT,
  fontSize: ${settings.fontSize},
  fontWeight: ${settings.fontWeight},
  fill: ${JSON.stringify(settings.fillColor)},
  letterSpacing: ${settings.letterSpacing},
};

const OUTLINE_D = ${JSON.stringify(path.d)};
const OUTLINE_OFFSET = ${JSON.stringify(path.translate)};

const LOGO_DATA_URL = ${JSON.stringify(logoDataUrl)};
const SILHOUETTE_DATA_URL = ${JSON.stringify(silhouetteDataUrl)};

const LOGO = ${JSON.stringify(settings.logo, null, 2)};

export default function App() {
  const [showGuides, setShowGuides] = useState(${settings.showGuides});

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
              strokeWidth="${settings.guides.pathStrokeWidth}"
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
