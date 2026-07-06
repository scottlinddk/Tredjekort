export function MapLegend() {
  return (
    <div className="map-legend">
      <p className="map-legend__title">Alignment confidence</p>
      <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--surveyed" /> Surveyed
      </div>
      <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--provisional" /> Provisional
      </div>
      <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--schematic" /> Schematic
      </div>
    </div>
  )
}
