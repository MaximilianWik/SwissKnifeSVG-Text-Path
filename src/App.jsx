import { useState } from "react";
import { OUTLINE_D, OUTLINE_OFFSET } from "./outlinePath.js";

const SENTENCE =
  "Chaotic space of creativity & multidisciplinary ideas exploring the limits of the human curiosity.";

// Seconds for one full lap around the silhouette.
const LAP_DURATION = "30s";

// Padding around the 662x636 silhouette so glyphs that stick out
// perpendicular to the path don't clip on the viewBox edges.
const PAD = 60;

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

export default function App() {
  const [showGuides, setShowGuides] = useState(true);
  const [logoWidth, setLogoWidth] = useState(LOGO_DEFAULT_WIDTH);

  const logoHeight = logoWidth * (LOGO_NATIVE.h / LOGO_NATIVE.w);
  const logoX = (662 - logoWidth) / 2;
  const logoY = (636 - logoHeight) / 2;

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
      </div>

      <svg
        viewBox={`-${PAD} -${PAD} ${662 + PAD * 2} ${636 + PAD * 2}`}
        width="min(95vw, 980px)"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Swiss-army knife outlined by a sentence about creativity and curiosity, looping continuously around the silhouette"
      >
        <defs>
          <path id="knife-outline" d={OUTLINE_D} />
        </defs>

        {/* Faint reference image — toggleable. */}
        {showGuides && (
          <image
            href="/swiss-knife.png"
            width="662"
            height="636"
            opacity="0.08"
          />
        )}

        <g transform={`translate(${OUTLINE_OFFSET.x}, ${OUTLINE_OFFSET.y})`}>
          {/* Subtle path stroke — toggleable. */}
          {showGuides && (
            <use
              href="#knife-outline"
              fill="none"
              stroke="#1a1a1a"
              strokeOpacity="0.18"
              strokeWidth="0.6"
            />
          )}

          {/*
            ONE sentence, wrapped seamlessly around the closed path using
            two synchronized <textPath> renderers. Each renders the same
            full sentence; B's startOffset is always (A's startOffset
            minus one path-length), which on a closed path is the same
            point in space, so characters that spill off A's end re-enter
            via B's start. No second sentence ever appears on screen.
          */}
          <text
            fontFamily={TEXT_FONT}
            fontSize="33"
            fontWeight="500"
            fill="#d30000"
            letterSpacing="0.3"
          >
            <textPath href="#knife-outline" startOffset="100%">
              <animate
                id="lap"
                attributeName="startOffset"
                from="100%"
                to="0%"
                dur={LAP_DURATION}
                repeatCount="indefinite"
              />
              {SENTENCE}
            </textPath>
          </text>

          <text
            fontFamily={TEXT_FONT}
            fontSize="33"
            fontWeight="500"
            fill="#d30000"
            letterSpacing="0.3"
          >
            <textPath href="#knife-outline" startOffset="0%">
              <animate
                attributeName="startOffset"
                from="0%"
                to="-100%"
                dur={LAP_DURATION}
                repeatCount="indefinite"
                begin="lap.begin"
              />
              {SENTENCE}
            </textPath>
          </text>
        </g>

        {/* Logo overlay — rendered last so it sits above the moving text. */}
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
