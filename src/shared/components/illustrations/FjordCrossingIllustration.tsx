/*
  About-page hero: the planned motorway (dash-dot survey alignment) crossing the
  Limfjord past the island Egholm — a tunnel dip on the Aalborg approach, a low
  bridge on the Lindholm side, amber interchanges at both landfalls, a short
  noise-screen segment, all over a faint coordinate-grid. Purely decorative.
*/
export function FjordCrossingIllustration() {
  return (
    <svg
      className="illus illus-hero"
      viewBox="0 0 480 168"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="illus-ticks" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            className="illus-stroke-grid"
            d="M20 16.5 v7 M16.5 20 h7"
            strokeWidth="1"
            opacity="0.6"
          />
        </pattern>
      </defs>

      {/* drafting grid */}
      <rect width="480" height="168" fill="url(#illus-ticks)" />

      {/* Limfjord */}
      <path
        className="illus-fill-fjord"
        fillOpacity="0.8"
        d="M0 84 q60 -8 120 0 t120 0 t120 0 t120 0 V150 H0 Z"
      />

      {/* Egholm */}
      <ellipse
        className="illus-fill-paper illus-stroke-graphite"
        cx="232"
        cy="112"
        rx="42"
        ry="13"
        strokeWidth="1.4"
      />

      {/* low bridge piers on the Lindholm approach */}
      <g className="illus-stroke-graphite" strokeWidth="1.6" opacity="0.75">
        <path d="M300 88 v22" />
        <path d="M324 84 v22" />
        <path d="M348 80 v22" />
      </g>

      {/* planned motorway alignment: land -> tunnel under the fjord -> bridge -> land */}
      <path
        className="illus-alignment illus-stroke-survey"
        strokeWidth="3"
        d="M18 150 C 80 150 100 112 168 112 C 210 112 214 112 232 112 C 300 112 300 74 380 60 C 430 51 452 48 464 46"
      />

      {/* short planned noise screen near the southern landfall */}
      <path className="illus-stroke-noise" strokeWidth="3" strokeLinecap="round" d="M40 138 h44" />

      {/* interchanges */}
      <circle
        className="illus-fill-amber illus-stroke-paper"
        cx="18"
        cy="150"
        r="6"
        strokeWidth="2.4"
      />
      <circle
        className="illus-fill-amber illus-stroke-paper"
        cx="464"
        cy="46"
        r="6"
        strokeWidth="2.4"
      />
    </svg>
  )
}
