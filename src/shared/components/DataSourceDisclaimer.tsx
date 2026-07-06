const CONFIDENCE_COPY: Record<string, string> = {
  surveyed: 'Traced from Vejdirektoratet\u2019s official registration drawings (E9095), georeferenced to real coordinates.',
  provisional: 'Traced from official drawings but not yet visually cross-checked against ramp geometry, treat as approximate.',
  schematic: 'No source geometry exists for this stretch (the tunnel and bridge crossing). This is a straight-line placeholder, not a real route.',
}

export function DataSourceDisclaimer() {
  return (
    <aside className="data-disclaimer" role="note">
      <p className="data-disclaimer__heading">About this map</p>
      <p>
        Road geometry is approximated from Vejdirektoratet&rsquo;s public planning
        documents. It is not official survey data and should not be used for anything
        beyond general orientation.
      </p>
      <p>
        The noise overlay is a simplified distance-based approximation, not a real
        acoustic model. Vejdirektoratet has published an actual Lden noise study
        (dB bands, drawing 9095-29011) for part of this route, but it is a raster
        map that has not yet been reliably georeferenced into this app.
      </p>
      <ul>
        {Object.entries(CONFIDENCE_COPY).map(([level, copy]) => (
          <li key={level}>
            <span className={`confidence-dot confidence-dot--${level}`} aria-hidden="true" />
            <strong>{level}:</strong> {copy}
          </li>
        ))}
      </ul>
    </aside>
  )
}
