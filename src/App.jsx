import { OUTLINE_D, OUTLINE_OFFSET } from "./outlinePath.js";

const SENTENCE =
  "Chaotic space of creativity & multidisciplinary ideas exploring the limits of the human curiosity.";

// Decorative separator between repeats. Written as an escape so this file
// stays pure ASCII on disk (PowerShell file moves can transcode UTF-8 to
// cp1252 and corrupt fancy glyphs otherwise).
const SEP = "  \u00B7  "; // space, middle-dot, space

// textPath does NOT wrap when the text overruns the path's end, so a single
// sentence shorter than the perimeter would visibly clip and snap. Trick:
// concatenate the sentence twice. The rendered text is now longer than the
// path, so the path is always fully covered, and animating startOffset
// 100% -> 0% shifts the whole train by exactly one path-length per cycle.
// Because the path is closed, that shift is geometrically identity, so the
// loop is perfectly seamless. Visually you read one sentence circling
// indefinitely; the second copy is just the seam-hider, off the visible
// arc most of the time.
const LOOP_TEXT = SENTENCE + SEP + SENTENCE + SEP;

// Seconds for one full lap around the silhouette. Tweak to taste.
const LAP_DURATION = "30s";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      <svg
        viewBox="0 0 662 636"
        width="min(95vw, 920px)"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Swiss-army knife outlined by a sentence about creativity and curiosity, looping continuously around the silhouette"
      >
        <defs>
          {/*
            Smoothed outer silhouette. Path coordinates start near (0, 0)
            and are positioned on the canvas via the wrapping <g transform>.
            textPath references this id and uses the geometry as-is.
          */}
          <path id="knife-outline" d={OUTLINE_D} />
        </defs>

        {/* Faint reference image so the silhouette stays recognisable. */}
        <image
          href="/swiss-knife.png"
          width="662"
          height="636"
          opacity="0.08"
        />

        <g transform={`translate(${OUTLINE_OFFSET.x}, ${OUTLINE_OFFSET.y})`}>
          {/* Subtle stroke so the contour stays visible where text is sparse. */}
          <use
            href="#knife-outline"
            fill="none"
            stroke="#1a1a1a"
            strokeOpacity="0.18"
            strokeWidth="0.6"
          />

          <text
            fontFamily='ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
            fontSize="33"
            fontWeight="500"
            fill="#111"
            letterSpacing="0.2"
          >
            <textPath href="#knife-outline" startOffset="100%">
              {/*
                Reverse direction so motion goes top-right -> up over the
                top of the knife -> back round, with "Chaotic" at the
                leading edge of the snake.
              */}
              <animate
                attributeName="startOffset"
                from="100%"
                to="0%"
                dur={LAP_DURATION}
                repeatCount="indefinite"
              />
              {LOOP_TEXT}
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
}
