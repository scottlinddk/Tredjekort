import { useState, type ReactNode } from 'react'

// Map overlays hide most of the map on a phone, so panels start minimized there.
const SMALL_SCREEN_QUERY = '(max-width: 640px)'

function startsCollapsed(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(SMALL_SCREEN_QUERY).matches
}

interface CollapsiblePanelProps {
  title: string
  className?: string
  children: ReactNode
}

export function CollapsiblePanel({ title, className, children }: CollapsiblePanelProps) {
  const [collapsed, setCollapsed] = useState(startsCollapsed)

  const classes = ['map-panel']
  if (collapsed) classes.push('map-panel--collapsed')
  if (className) classes.push(className)

  return (
    <section className={classes.join(' ')}>
      <button
        type="button"
        className="map-panel__toggle"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((previous) => !previous)}
      >
        <span className="map-panel__title">{title}</span>
        <span className="map-panel__icon" aria-hidden="true">
          {collapsed ? '+' : '−'}
        </span>
      </button>
      {!collapsed && <div className="map-panel__body">{children}</div>}
    </section>
  )
}
