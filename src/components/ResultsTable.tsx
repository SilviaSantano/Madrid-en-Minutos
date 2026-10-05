import { ExternalLink } from 'lucide-react'
import { useI18n } from '../i18n'
import { modes, resultFor } from '../lib/modes'
import { compactDuration, speedClass } from '../lib/format'
import { areaBands } from '../lib/reachability'
import { lineRefForRide } from '../lib/stops'
import type { Destination, DestinationCommute, Point, TravelMode } from '../types/commute'
import { LineChip } from './LineChip'

export type RouteSelection = {
  destinationId: string
  mode: TravelMode
}

type ResultsTableProps = {
  loading: boolean
  error: boolean
  results: DestinationCommute[]
  destinations: Destination[]
  home: Point
  selection: RouteSelection | null
  lineColours: Record<string, string>
  onSelect: (selection: RouteSelection) => void
}

// Opens the same trip in Google Maps, to see the full step-by-step itinerary.
function googleMapsUrl(from: Point, to: Point, mode: TravelMode, lang: string): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: mode,
    hl: lang,
  })
  return `https://www.google.com/maps/dir/?${params}`
}

export function ResultsTable({
  loading,
  error,
  results,
  destinations,
  home,
  selection,
  lineColours,
  onSelect,
}: ResultsTableProps) {
  const { t, lang } = useI18n()
  if (error) {
    return <p className="error-text">{t.genericError}</p>
  }

  const byId = new Map(results.map((result) => [result.destinationId, result]))
  const selectedDestination = destinations.find((d) => d.id === selection?.destinationId)
  const selectedCommute = selection ? byId.get(selection.destinationId) : undefined
  const selectedResult = selection && selectedCommute ? resultFor(selectedCommute, selection.mode) : undefined

  return (
    <div className="results">
      <table className="results-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">{t.place}</span>
            </th>
            {modes.map(({ mode, Icon }) => (
              <th key={mode} scope="col">
                <Icon size={16} aria-hidden />
                <span>{t.modeShort[mode]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {destinations.map((destination, index) => {
            const commute = byId.get(destination.id)
            const times = commute
              ? modes.map(({ mode }) => resultFor(commute, mode)).filter((r) => !r.error).map((r) => r.durationValueSeconds)
              : []
            const fastest = times.length > 0 ? Math.min(...times) : null
            return (
              <tr key={destination.id}>
                <th scope="row">
                  <span className="place-badge">{index + 1}</span>
                  <span className="place-name">{destination.label}</span>
                </th>
                {modes.map(({ mode }) => {
                  const result = commute ? resultFor(commute, mode) : undefined
                  const selected = selection?.destinationId === destination.id && selection.mode === mode
                  if (loading || !result) {
                    return (
                      <td key={mode}>
                        <span className="time-cell skeleton" />
                      </td>
                    )
                  }
                  return (
                    <td key={mode}>
                      <button
                        type="button"
                        className={[
                          'time-cell',
                          result.error ? 'unavailable' : speedClass(result.durationValueSeconds),
                          selected ? 'selected' : '',
                          result.durationValueSeconds === fastest ? 'fastest' : '',
                        ].join(' ')}
                        aria-pressed={selected}
                        aria-label={t.cellLabel(
                          t.modeLong[mode],
                          destination.label,
                          result.error ? t.unavailable : result.durationText,
                        )}
                        title={result.error ? t.routingError(result.error, mode) : undefined}
                        onClick={() => onSelect({ destinationId: destination.id, mode })}
                      >
                        {result.error ? '–' : compactDuration(result.durationValueSeconds)}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="time-legend" aria-label={t.colourKey}>
        {areaBands.map((minutes, index) => (
          <span key={minutes}>
            <i className={`key band-${index}`} /> ≤{minutes} min
          </span>
        ))}
        <span>
          <i className="key beyond" /> {t.more}
        </span>
      </div>

      {selection && selectedDestination && selectedResult && !loading ? (
        <div className="route-detail">
          <div className="route-detail-head">
            <span>
              {t.modeLong[selection.mode]} {t.routeTo} <strong>{selectedDestination.label}</strong>
            </span>
            <a href={googleMapsUrl(home, selectedDestination.location, selection.mode, lang)} target="_blank" rel="noreferrer">
              Google Maps <ExternalLink size={13} aria-hidden />
            </a>
          </div>
          {selectedResult.error ? (
            <p className="error-text">{t.routingError(selectedResult.error, selection.mode)}</p>
          ) : (
            <>
              <p className="route-detail-time">
                <strong>{selectedResult.durationText}</strong> · {selectedResult.distanceText}
              </p>
              {selectedResult.rides ? (
                <div className="chips">
                  {selectedResult.rides.length === 0 ? <span className="muted">{t.walkWholeWay}</span> : null}
                  {selectedResult.rides.map((ride, index) => {
                    const ref = lineRefForRide(ride)
                    return <LineChip key={index} line={ref ?? ride} colour={ref ? lineColours[ref] : undefined} />
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <p className="hint">{t.tapForRoute}</p>
      )}
    </div>
  )
}
