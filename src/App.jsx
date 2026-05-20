import { OUTLINE_D, OUTLINE_OFFSET } from "./outlinePath.js";

const SENTENCE =
  "Chaotic space of creativity & multidisciplinary ideas exploring the limits of the human curiosity.";

// Seconds for one full lap around the silhouette.
const LAP_DURATION = "30s";

// Padding around the 662x636 silhouette so glyphs that stick out
// perpendicular to the path don't clip on the viewBox edges.
const PAD = 60;

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
        viewBox={`-${PAD} -${PAD} ${662 + PAD * 2} ${636 + PAD * 2}`}
        width="min(95vw, 980px)"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Swiss-army knife outlined by a sentence about creativity and curiosity, looping continuously around the silhouette"
      >
        <defs>
          {/*
            Smoothed outer silhouette. Path coordinates start near (0, 0)
            and are positioned on the canvas via the wrapping <g transform>.
          */}
          <path id="knife-outline" d={OUTLINE_D} />
        </defs>

        {/* Faint reference image so the silhouette stays recognisable. */}
        <image href="/swiss-knife.png" width="662" height="636" opacity="0.08" />

        <g transform={`translate(${OUTLINE_OFFSET.x}, ${OUTLINE_OFFSET.y})`}>
          {/* Subtle stroke so the contour stays visible where text is sparse. */}
          <use
            href="#knife-outline"
            fill="none"
            stroke="#1a1a1a"
            strokeOpacity="0.18"
            strokeWidth="0.6"
          />

          {/*
            ONE sentence, wrapped seamlessly around the closed path using
            two synchronized <textPath> renderers. Each renders the same
            full sentence; at any moment one of them is fully on the path
            and the other is entirely off, OR they each render a contiguous
            slice such that together they show exactly one sentence with
            the join at the closed-path seam (where path-end = path-start
            geometrically -> invisible). No duplicate sentence ever appears
            on screen.

            Mechanism: textPath B's startOffset is always (textPath A's
            startOffset minus 100%), which equals "one path length earlier".
            Because the path is closed, that's the same point in space, so
            characters that spill off the end of A are rendered by B at the
            start of the path, perfectly continuing the line.
          */}
          <text
            fontFamily='ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
            fontSize="33"
            fontWeight="500"
            fill="#111"
            letterSpacing="0.2"
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
            fontFamily='ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
            fontSize="33"
            fontWeight="500"
            fill="#111"
            letterSpacing="0.2"
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
      </svg>
    </div>
  );
}
