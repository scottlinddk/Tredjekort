import type { CSSProperties } from 'react'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { CROSSING_STYLE } from '../constants/alternatives'
import type { CrossingAlternativeId } from '../types/alternatives.types'

// Schematic longitudinal section across Sønderdyb, Mølholm (south) on the left and
// Egholm on the right. Not to scale and vertically exaggerated: the presentation gives
// no lengths, depths or clearances for the alternatives. The only published dimension
// used is the shipping channel's depth of about 10 m (project page).
const GROUND_SOUTH = 'M0 110 L172 110 L172 280 L0 280 Z'
const GROUND_NORTH = 'M556 112 L720 112 L720 280 L556 280 Z'
const SEABED = 'M172 122 L204 150 L300 156 L320 200 L420 200 L440 156 L530 150 L556 122'
const WATER = `${SEABED} L556 120 L172 120 Z`
const SOIL = `${SEABED} L556 280 L172 280 Z`

const TUNNEL_ROAD = 'M0 110 L104 110 C150 110 168 226 214 226 L506 226 C552 226 566 112 612 112 L720 112'
const HIGH_BRIDGE_ROAD = 'M0 110 L40 110 C130 110 200 38 300 34 L440 34 C540 38 600 112 680 112 L720 112'
const LOW_BRIDGE_ROAD_SOUTH = 'M0 110 L172 104 L340 98'
const LOW_BRIDGE_ROAD_NORTH = 'M400 98 L556 104 L720 112'

function Ship({ mastTop }: { mastTop: number }) {
  // Hull on the water surface in the channel; the mast shows the clearance needed.
  return (
    <g className="profile-ship" aria-hidden="true">
      <path d="M346 112 L398 112 L390 121 L352 121 Z" />
      <path d={`M372 112 L372 ${mastTop}`} />
      <path d={`M373 ${mastTop + 6} L392 106 L373 106 Z`} className="profile-ship__sail" />
    </g>
  )
}

function TunnelBox({ segmented }: { segmented: boolean }) {
  const joints = segmented ? [244, 284, 324, 364, 404, 444, 484] : []
  return (
    <g className="profile-structure">
      <rect x="204" y="214" width="312" height="24" rx="3" />
      {joints.map((x) => <path key={x} d={`M${x} 214 V238`} className="profile-structure__joint" />)}
    </g>
  )
}

function Piers({ xs, deckY }: { xs: number[]; deckY: (x: number) => number }) {
  return (
    <g className="profile-piers">
      {xs.map((x) => <path key={x} d={`M${x} ${deckY(x)} V${x > 300 && x < 440 ? 200 : 152}`} />)}
    </g>
  )
}

export function CrossingProfile({ alternative }: { alternative: CrossingAlternativeId }) {
  const { t } = useI18n()
  const color = CROSSING_STYLE[alternative].color
  const isTunnel = alternative === 'immersed-tunnel' || alternative === 'cut-and-cover'

  return (
    <figure className="crossing-profile" style={{ '--alternative-color': color } as CSSProperties}>
      <svg viewBox="0 0 720 280" role="img" aria-labelledby={`profile-title-${alternative}`}>
        <title id={`profile-title-${alternative}`}>{t(`alternatives.profile.alt.${alternative}`)}</title>
        <path d={SOIL} className="profile-soil" />
        <path d={GROUND_SOUTH} className="profile-soil" />
        <path d={GROUND_NORTH} className="profile-soil" />
        <path d={WATER} className="profile-water" />
        <path d={SEABED} className="profile-seabed" />
        {/* Shipping channel, about 10 m deep (the one published dimension). */}
        <path d="M320 200 L420 200" className="profile-channel" />
        <text x="370" y="194" textAnchor="middle" className="profile-label profile-label--small">{t('alternatives.profile.channel')}</text>

        {alternative === 'immersed-tunnel' && <>
          <path d="M196 158 L212 210 L508 210 L524 156" className="profile-trench" />
          <TunnelBox segmented />
          <Ship mastTop={72} />
          <text x="360" y="258" textAnchor="middle" className="profile-label">{t('alternatives.profile.note.immersed-tunnel')}</text>
        </>}
        {alternative === 'cut-and-cover' && <>
          <rect x="190" y="88" width="340" height="160" className="profile-cofferdam" />
          <TunnelBox segmented={false} />
          <Ship mastTop={72} />
          <text x="360" y="64" textAnchor="middle" className="profile-label profile-label--small">{t('alternatives.profile.cofferdam')}</text>
          <text x="360" y="266" textAnchor="middle" className="profile-label">{t('alternatives.profile.note.cut-and-cover')}</text>
        </>}
        {alternative === 'high-bridge' && <>
          <Piers xs={[130, 190, 250, 300, 440, 490, 550, 610]} deckY={(x) => x < 300 ? 110 - (x - 40) * 0.29 : x > 440 ? 34 + (x - 440) * 0.3 : 34} />
          <Ship mastTop={56} />
          <path d="M370 38 V56" className="profile-clearance" />
          <text x="378" y="50" className="profile-label profile-label--small">{t('alternatives.profile.clearanceUnknown')}</text>
          <text x="360" y="258" textAnchor="middle" className="profile-label">{t('alternatives.profile.note.high-bridge')}</text>
        </>}
        {alternative === 'bascule-bridge' && <>
          <Piers xs={[200, 240, 280, 336, 404, 460, 500, 540]} deckY={(x) => x < 370 ? 104 - (x - 172) * 0.036 : 98 + (x - 400) * 0.038} />
          {/* The leaf, raised for a passing ship. */}
          <path d="M340 98 L372 44" className="profile-road profile-leaf" />
          <Ship mastTop={60} />
          <g className="profile-signal" aria-hidden="true">
            <rect x="120" y="62" width="14" height="30" rx="3" />
            <circle cx="127" cy="70" r="4" className="profile-signal__stop" />
            <circle cx="127" cy="84" r="4" />
            <path d="M127 92 V104" />
          </g>
          <text x="146" y="74" className="profile-label profile-label--small">{t('alternatives.profile.trafficStops')}</text>
          <text x="360" y="258" textAnchor="middle" className="profile-label">{t('alternatives.profile.note.bascule-bridge')}</text>
        </>}

        <path d={isTunnel ? TUNNEL_ROAD : alternative === 'high-bridge' ? HIGH_BRIDGE_ROAD : LOW_BRIDGE_ROAD_SOUTH} className="profile-road" />
        {alternative === 'bascule-bridge' && <path d={LOW_BRIDGE_ROAD_NORTH} className="profile-road" />}

        <text x="12" y="134" className="profile-label">Mølholm</text>
        <text x="708" y="136" textAnchor="end" className="profile-label">Egholm</text>
        <text x="364" y="140" textAnchor="middle" className="profile-label profile-label--water">Sønderdyb</text>
      </svg>
      <figcaption>{t('alternatives.profile.caption')}</figcaption>
    </figure>
  )
}
