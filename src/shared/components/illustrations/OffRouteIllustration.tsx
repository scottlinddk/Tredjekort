/*
  Error-boundary spot: a dash-dot alignment that runs off the drawing and stops
  at an amber marker — "off route". Decorative only.
*/
export function OffRouteIllustration() {
  return (
    <svg
      className="illus illus-spot"
      viewBox="0 0 120 120"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {/* coordinate ticks */}
      <g className="illus-stroke-grid" strokeWidth="1.2" opacity="0.7">
        <path d="M18 26 v6 M15 29 h6" />
        <path d="M100 40 v6 M97 43 h6" />
        <path d="M96 98 v6 M93 101 h6" />
      </g>

      {/* the alignment we were following, ending abruptly */}
      <path
        className="illus-alignment illus-stroke-survey"
        strokeWidth="3.2"
        d="M14 104 C 42 100 46 66 70 58"
      />
      {/* faint would-be continuation */}
      <path
        className="illus-alignment illus-stroke-graphite"
        strokeWidth="2.4"
        opacity="0.5"
        d="M78 54 C 96 48 100 40 104 22"
      />

      {/* stop marker */}
      <circle
        className="illus-fill-paper illus-stroke-amber"
        cx="72"
        cy="56"
        r="13"
        strokeWidth="3"
      />
      <path
        className="illus-stroke-amber"
        strokeWidth="3.4"
        strokeLinecap="round"
        d="M72 50 v6"
      />
      <circle className="illus-fill-amber" cx="72" cy="61.5" r="1.9" />
    </svg>
  )
}
