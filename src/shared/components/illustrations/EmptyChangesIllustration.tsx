/*
  Empty state for the Ændringer (changes) feed: a monitored document sheet under
  a survey-blue magnifier — "the pages are watched, nothing has changed yet".
  Decorative only.
*/
export function EmptyChangesIllustration() {
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
        <path d="M14 20 v6 M11 23 h6" />
        <path d="M104 30 v6 M101 33 h6" />
        <path d="M20 100 v6 M17 103 h6" />
      </g>

      {/* monitored page */}
      <g transform="rotate(-4 58 60)">
        <rect
          className="illus-fill-paper illus-stroke-graphite"
          x="30"
          y="24"
          width="52"
          height="66"
          rx="3"
          strokeWidth="1.6"
        />
        <g className="illus-stroke-graphite" strokeWidth="2" strokeLinecap="round" opacity="0.7">
          <path d="M39 38 h34" />
          <path d="M39 47 h34" />
          <path d="M39 56 h24" />
        </g>
        {/* one line flagged in survey blue: the thing being watched */}
        <path
          className="illus-stroke-survey"
          strokeWidth="2.4"
          strokeLinecap="round"
          d="M39 68 h30"
        />
      </g>

      {/* magnifier */}
      <circle
        className="illus-fill-paper illus-stroke-survey"
        cx="78"
        cy="78"
        r="16"
        strokeWidth="3"
        fillOpacity="0.35"
      />
      <path
        className="illus-stroke-survey"
        strokeWidth="4"
        strokeLinecap="round"
        d="M90 90 l12 12"
      />
    </svg>
  )
}
