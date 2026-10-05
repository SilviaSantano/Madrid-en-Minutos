import { useState } from 'react'
import { Bookmark, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { compactDuration, speedClass } from '../lib/format'
import { homeLetter, maxSavedHomes } from '../lib/homes'
import { modes, resultFor } from '../lib/modes'
import type { Destination, DestinationCommute, Point, SavedHome, TravelMode } from '../types/commute'

type CompareHomesProps = {
  savedHomes: SavedHome[]
  destinations: Destination[]
  results: Record<string, DestinationCommute[]> | null
  loading: boolean
  // The home currently on the map; it can be saved if it isn't already.
  currentHome: Point | null
  currentIsSaved: boolean
  onSave: () => void
  onRemove: (id: string) => void
  onShow: (home: SavedHome) => void
}

// Saved candidate homes side by side: one column per home, one row per place, plus the
// total one-way time to all places for the chosen travel mode.
export function CompareHomes({
  savedHomes,
  destinations,
  results,
  loading,
  currentHome,
  currentIsSaved,
  onSave,
  onRemove,
  onShow,
}: CompareHomesProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<TravelMode>('transit')

  const secondsFor = (home: SavedHome, destination: Destination): number | null => {
    const commute = results?.[home.id]?.find((r) => r.destinationId === destination.id)
    const result = commute ? resultFor(commute, mode) : undefined
    return result && !result.error ? result.durationValueSeconds : null
  }
  // A total only counts when every place could be reached.
  const totals = savedHomes.map((home) => {
    const times = destinations.map((destination) => secondsFor(home, destination))
    return times.every((time) => time !== null) ? times.reduce((sum, time) => sum + (time ?? 0), 0) : null
  })
  const validTotals = totals.filter((total): total is number => total !== null)
  const bestTotal = validTotals.length > 1 ? Math.min(...validTotals) : null
  const canSave = currentHome !== null && !currentIsSaved && savedHomes.length < maxSavedHomes

  return (
    <div className="compare">
      {savedHomes.length === 0 ? <p className="muted">{t.compareEmpty}</p> : null}

      <ul className="saved-homes">
        {savedHomes.map((home, index) => (
          <li key={home.id}>
            <span className="home-letter">{homeLetter(index)}</span>
            <button type="button" className="saved-home-label" onClick={() => onShow(home)} title={t.showOnMap}>
              {home.label ?? t.pointOnMap}
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={t.removeHome(home.label ?? homeLetter(index))}
              onClick={() => onRemove(home.id)}
            >
              <X size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {canSave ? (
        <button type="button" className="add-button" onClick={onSave}>
          <Bookmark size={16} aria-hidden /> {t.saveHome}
        </button>
      ) : null}

      {savedHomes.length > 0 && destinations.length > 0 ? (
        <>
          <div className="segmented" role="radiogroup" aria-label={t.travelMode}>
            {modes.map(({ mode: option, Icon }) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={mode === option}
                className={mode === option ? 'active' : ''}
                onClick={() => setMode(option)}
              >
                <Icon size={15} aria-hidden />
                {t.modeShort[option]}
              </button>
            ))}
          </div>
          <table className="results-table compare-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">{t.place}</span>
                </th>
                {savedHomes.map((home, index) => (
                  <th key={home.id} scope="col">
                    <button
                      type="button"
                      className="home-letter"
                      aria-label={`${t.showOnMap}: ${home.label ?? t.pointOnMap}`}
                      onClick={() => onShow(home)}
                    >
                      {homeLetter(index)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {destinations.map((destination, index) => (
                <tr key={destination.id}>
                  <th scope="row">
                    <span className="place-badge">{index + 1}</span>
                    <span className="place-name">{destination.label}</span>
                  </th>
                  {savedHomes.map((home) => {
                    const seconds = loading ? undefined : secondsFor(home, destination)
                    return (
                      <td key={home.id}>
                        {seconds === undefined ? (
                          <span className="time-cell skeleton" />
                        ) : (
                          <span className={`time-cell ${seconds === null ? 'unavailable' : speedClass(seconds)}`}>
                            {seconds === null ? '–' : compactDuration(seconds)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="total-row">
                <th scope="row">{t.totalOneWay}</th>
                {savedHomes.map((home, index) => {
                  const total = totals[index]
                  return (
                    <td key={home.id}>
                      {loading ? (
                        <span className="time-cell skeleton" />
                      ) : (
                        <span className={`total-cell ${total !== null && total === bestTotal ? 'best' : ''}`}>
                          {total === null ? '–' : compactDuration(total)}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
          {bestTotal !== null ? <p className="hint">{t.bestHomeHint}</p> : null}
        </>
      ) : null}
    </div>
  )
}
