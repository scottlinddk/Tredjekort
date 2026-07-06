interface LayerToggleProps {
  showNoise: boolean
  onToggleNoise: (next: boolean) => void
}

export function LayerToggle({ showNoise, onToggleNoise }: LayerToggleProps) {
  return (
    <div className="layer-toggle">
      <label>
        <input
          type="checkbox"
          checked={showNoise}
          onChange={(event) => onToggleNoise(event.target.checked)}
        />
        Approximate noise bands
      </label>
    </div>
  )
}
