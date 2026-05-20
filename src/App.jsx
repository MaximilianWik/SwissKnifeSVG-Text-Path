import { OUTLINE_D, OUTLINE_OFFSET } from "./outlinePath.js";

const SENTENCE =
  "Chaotic space of creativity & multidisciplinary ideas exploring the limits of the human curiosity.";

// Path perimeter is roughly 2.7k user units. With ~6.5 px per character at the
// chosen font size, ~400–500 characters fit. SENTENCE is ~100 chars, so 6
// repeats overflows the path slightly — guarantees a fully-wrapped, looped
// rendering with no visible gap.
const REPEATS = 6;
const SEPARATOR = "  •  ";
const FULL_TEXT = Array(REPEATS).fill(SENTENCE).join(SEPARATOR) + SEPARATOR;

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
        aria-label="Swiss-army knife outlined by a repeating sentence about creativity and curiosity"
      >
        <defs>
          {/*
            Outer silhouette of the knife. Path coordinates start at (0, 0),
            so we offset them to the canvas via the wrapping <g transform>
            below. textPath references this id and uses the geometry as-is.
          */}
          <path id="knife-outline" d={OUTLINE_D} />
        </defs>

        {/* Faint reference image so the silhouette is recognisable behind the text. */}
        <image
          href="/swiss-knife.png"
          width="662"
          height="636"
          opacity="0.1"
        />

        <g transform={`translate(${OUTLINE_OFFSET.x}, ${OUTLINE_OFFSET.y})`}>
          {/* Subtle stroke makes the contour readable where text is sparse. */}
          <use
            href="#knife-outline"
            fill="none"
            stroke="#1a1a1a"
            strokeOpacity="0.18"
            strokeWidth="0.6"
          />

          {/*
            Text begins at the path origin — top-right of the viewBox — and
            walks the path clockwise-around-the-shape (down then leftward,
            sweeping the full silhouette). Repeating the sentence creates
            the "infinite loop" feel.
          */}
          <text
            fontFamily='ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
            fontSize="11"
            fontWeight="500"
            fill="#111"
            letterSpacing="0.2"
          >
            <textPath
              href="#knife-outline"
              startOffset="0"
              lengthAdjust="spacing"
            >
              {FULL_TEXT}
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
}
