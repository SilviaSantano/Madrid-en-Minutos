import { Layers, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { modes } from '../lib/modes'
import { areaBands } from '../lib/reachability'
import type { AreaSettings } from '../lib/useReachableArea'
import type { RoutingErrorCode } from '../types/commute'

type ReachableAreaControlProps = {
  settings: AreaSettings
  destinationCount: number
  loading: boolean
  error: RoutingErrorCode | null
  empty: boolean
  onChange: (settings: AreaSettings) => void
}

// Floating map control: toggles the reachable-area layer and picks its travel mode.
export function ReachableAreaControl({
  settings,
  destinationCount,
  loading,
  error,
  empty,
  onChange,
}: ReachableAreaControlProps) {
  const { t } = useI18n()
  if (!settings.enabled) {
    return (
      <button type="button" className="map-button" onClick={() => onChange({ ...settings, enabled: true })}>
        <Layers size={16} aria-hidden />
        {t.reachableArea}
      </button>
    )
  }

  let status: string | null = null
  if (destinationCount === 0) status = t.addPlaceFirst
  else if (error) status = t.routingError(error)
  else if (loading) status = t.calculating
  else if (empty) status = t.areaEmpty

  return (
    <div className="area-card" role="group" aria-label={t.reachableArea}>
      <div className="area-card-head">
        <strong>
          <Layers size={16} aria-hidden /> {t.reachableArea}
        </strong>
        <button
          type="button"
          className="icon-button"
          aria-label={t.hideReachableArea}
          onClick={() => onChange({ ...settings, enabled: false })}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <p className="muted">{t.reachableExplanation}</p>
      <div className="area-legend">
        {areaBands.map((minutes, index) => (
          <span key={minutes}>
            <i className={`band band-${index}`} /> {minutes} min
          </span>
        ))}
      </div>
      <div className="segmented" role="radiogroup" aria-label={t.travelMode}>
        {modes.map(({ mode, Icon }) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={settings.mode === mode}
            className={settings.mode === mode ? 'active' : ''}
            onClick={() => onChange({ ...settings, mode })}
          >
            <Icon size={15} aria-hidden />
            {t.modeShort[mode]}
          </button>
        ))}
      </div>
      {status ? <p className={error ? 'error-text' : 'muted'}>{status}</p> : null}
    </div>
  )
}
