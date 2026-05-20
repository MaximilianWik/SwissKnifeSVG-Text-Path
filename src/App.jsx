import { OUTLINE_D, OUTLINE_OFFSET } from "./outlinePath.js";

const SENTENCE =
  "Chaotic space of creativity & multidisciplinary ideas exploring the limits of the human curiosity.";

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
            Outer silhouette of the knife. Path coordinates start at (0, 0),
            so we offset them to the canvas via the wrapping <g transform>.
            textPath references this id and uses the geometry as-is.
          */}
          <path id="knife-outline" d={OUTLINE_D} />
        </defs>

        {/* Faint reference image so the silhouette stays recognisable. */}
        <image
          href="/swiss-knife.png"
          width="662"
          height="636"
          opacity="0.1"
        />

        <g transform={`translate(${OUTLINE_OFFSET.x}, ${OUTLINE_OFFSET.y})`}>
          {/* Subtle stroke makes the contour readable when the text is on the
              far side of the loop. */}
          <use
            href="#knife-outline"
            fill="none"
            stroke="#1a1a1a"
            strokeOpacity="0.2"
            strokeWidth="0.6"
          />

          {/*
            One sentence, looping continuously. The path is closed, so the
            geometric end-point coincides with the start (top-right of the
            canvas) — animating startOffset from 0% → 100% slides the whole
            sentence around the silhouette and back to its origin without
            the head jumping in space. "Chaotic" sits at the leading edge
            of the sentence in reading order, so it is always the first
            word to enter a new stretch of the path.
          */}
          <text
            fontFamily='ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
            fontSize="33"
            fontWeight="500"
            fill="#111"
            letterSpacing="0.2"
          >
            <textPath href="#knife-outline" startOffset="0%">
              <animate
                attributeName="startOffset"
                from="100%"
                to="0%"
                dur={LAP_DURATION}
                repeatCount="indefinite"
              />
              {SENTENCE}
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
}
