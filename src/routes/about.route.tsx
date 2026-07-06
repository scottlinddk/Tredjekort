export function AboutRoute() {
  return (
    <article className="about-route">
      <h1>About the 3. Limfjordsforbindelse</h1>
      <p>
        A planned 20 km, four-lane motorway running west of Aalborg via the island Egholm,
        connecting a southern extension of the E39 to the E45 at a new interchange south of
        Dall. The route runs from Aalborg to Egholm through a tunnel, and from Egholm to
        Lindholm via a low bridge.
      </p>
      <dl className="about-route__facts">
        <dt>Length</dt>
        <dd>Approximately 20 km</dd>
        <dt>Tunnel</dt>
        <dd>Approximately 1.1 km, with 450 m ramp sections on each side</dd>
        <dt>Decided</dt>
        <dd>28 June 2021 (Infrastrukturplan 2035)</dd>
        <dt>Construction law passed</dt>
        <dd>May 2024</dd>
        <dt>Budget</dt>
        <dd>8.9 billion DKK (2024 prices)</dd>
        <dt>Expected completion</dt>
        <dd>2034</dd>
      </dl>
      <p className="about-route__note">
        This project is still evolving, expropriation reviews and design changes (such as the
        southern interchange near Dall) are ongoing as of mid-2026. Figures here reflect the
        most recent public information at the time this was built and may be superseded.
      </p>
    </article>
  )
}
