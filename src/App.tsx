import { useEffect, useMemo, useRef, useState } from 'react'
import { AddressSearch, type AddressResult } from './components/AddressSearch'
import { MadridMap } from './components/MadridMap'
import { ResultsPanel } from './components/ResultsPanel'
import { calculateCommuteResults } from './lib/routing'
import { fetchMadridTransitStops } from './lib/stops'
import { useReachableArea, type AreaSettings } from './lib/useReachableArea'
import type { ClickMode, Destination, DestinationCommute, Point, TransitStop } from './types/commute'

const maxDestinations = 3
const storageKey = 'madrid-commute-map:v1'

type SavedState = {
  destinations: Destination[]
  home: Point | null
}

function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw) as SavedState
      return { destinations: parsed.destinations ?? [], home: parsed.home ?? null }
    }
  } catch {
    // Storage unavailable or corrupt: start empty.
  }
  return { destinations: [], home: null }
}

// Default departure: next weekday at 08:30 local time, a typical morning commute.
function defaultDeparture(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1)
  }
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T08:30`
}

// Interprets a datetime-local value ("2026-10-06T08:30") as Madrid time, whatever the browser's time zone.
function madridTimeToDate(value: string): Date {
  const wallClockAsUtc = new Date(`${value}:00Z`)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(wallClockAsUtc)
      .map((part) => [part.type, part.value]),
  )
  const madridWallClock = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return new Date(wallClockAsUtc.getTime() - (madridWallClock - wallClockAsUtc.getTime()))
}

const initialState = loadSavedState()
const hasSavedRoute = initialState.home !== null && initialState.destinations.length > 0

function App() {
  const [destinations, setDestinations] = useState<Destination[]>(initialState.destinations)
  const [home, setHome] = useState<Point | null>(initialState.home)
  const [departure, setDeparture] = useState(defaultDeparture)
  const [clickMode, setClickMode] = useState<ClickMode>(
    initialState.destinations.length === 0 ? 'destination' : 'home',
  )
  const [results, setResults] = useState<DestinationCommute[]>([])
  const [isLoading, setIsLoading] = useState(hasSavedRoute)
  const [error, setError] = useState<string | null>(null)
  const [stops, setStops] = useState<TransitStop[]>([])
  const [focus, setFocus] = useState<Point | null>(null)
  const [areaSettings, setAreaSettings] = useState<AreaSettings>({ enabled: false, minutes: 30, mode: 'public_transport' })
  const departureDate = useMemo(() => madridTimeToDate(departure), [departure])
  const reachable = useReachableArea(destinations, departureDate, areaSettings)
  // Only the most recent request may update the results.
  const latestRequest = useRef(0)

  const destinationsFull = destinations.length >= maxDestinations
  const effectiveMode: ClickMode = destinationsFull ? 'home' : clickMode

  useEffect(() => {
    void fetchMadridTransitStops().then(setStops)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ destinations, home } satisfies SavedState))
    } catch {
      // Ignore: persistence is a convenience.
    }
  }, [destinations, home])

  async function evaluate(nextHome: Point | null, nextDestinations: Destination[], nextDeparture: string) {
    const requestId = ++latestRequest.current
    if (!nextHome || nextDestinations.length === 0) {
      setResults([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const commuteResults = await calculateCommuteResults(nextHome, nextDestinations, madridTimeToDate(nextDeparture))
      if (requestId === latestRequest.current) {
        setResults(commuteResults)
      }
    } catch (reason) {
      console.error(reason)
      if (requestId === latestRequest.current) {
        setResults([])
        setError('Something went wrong while calculating routes. Please try again.')
      }
    } finally {
      if (requestId === latestRequest.current) {
        setIsLoading(false)
      }
    }
  }

  // Recalculate saved routes once on load (isLoading starts true in that case).
  useEffect(() => {
    if (!hasSavedRoute) return
    const requestId = ++latestRequest.current
    calculateCommuteResults(initialState.home!, initialState.destinations, madridTimeToDate(departure))
      .then((commuteResults) => {
        if (requestId === latestRequest.current) setResults(commuteResults)
      })
      .catch((reason: unknown) => {
        console.error(reason)
        if (requestId === latestRequest.current) {
          setError('Something went wrong while calculating routes. Please try again.')
        }
      })
      .finally(() => {
        if (requestId === latestRequest.current) setIsLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateDestinations(nextDestinations: Destination[]) {
    setDestinations(nextDestinations)
    void evaluate(home, nextDestinations, departure)
  }

  function updateHome(nextHome: Point | null) {
    setHome(nextHome)
    void evaluate(nextHome, destinations, departure)
  }

  function placePoint(point: Point, label?: string) {
    if (effectiveMode === 'home') {
      updateHome(point)
      return
    }
    const nextDestinations = [
      ...destinations,
      { id: crypto.randomUUID(), label: label ?? `Destination ${destinations.length + 1}`, location: point },
    ]
    updateDestinations(nextDestinations)
    if (nextDestinations.length >= maxDestinations) {
      setClickMode('home')
    }
  }

  function handleAddressSelect(result: AddressResult) {
    placePoint(result.location, result.shortLabel)
    setFocus(result.location)
  }

  function moveDestination(id: string, point: Point) {
    updateDestinations(destinations.map((d) => (d.id === id ? { ...d, location: point } : d)))
  }

  function removeDestination(id: string) {
    updateDestinations(destinations.filter((d) => d.id !== id))
    setClickMode('destination')
  }

  function renameDestination(id: string, label: string) {
    // Labels don't affect routes, so no recalculation is needed.
    setDestinations((previous) => previous.map((d) => (d.id === id ? { ...d, label } : d)))
  }

  function changeDeparture(value: string) {
    if (!value) return
    setDeparture(value)
    void evaluate(home, destinations, value)
  }

  function resetAll() {
    setDestinations([])
    setClickMode('destination')
    updateHome(null)
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>Madrid Commute Map</h1>
          <p>
            Add up to {maxDestinations} places you travel to regularly, then pick a candidate home to compare
            driving and public transport times.
          </p>
        </div>
        <label className="departure">
          Departure (Madrid time)
          <input type="datetime-local" value={departure} onChange={(event) => changeDeparture(event.target.value)} />
        </label>
      </header>

      <div className="toolbar">
        <div className="mode-toggle" role="radiogroup" aria-label="What a map click places">
          <button
            type="button"
            role="radio"
            aria-checked={effectiveMode === 'destination'}
            className={effectiveMode === 'destination' ? 'active' : ''}
            disabled={destinationsFull}
            onClick={() => setClickMode('destination')}
          >
            Add destination ({destinations.length}/{maxDestinations})
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={effectiveMode === 'home'}
            className={effectiveMode === 'home' ? 'active' : ''}
            onClick={() => setClickMode('home')}
          >
            Set home
          </button>
        </div>
        <AddressSearch
          placeholder={effectiveMode === 'home' ? 'Search a home address…' : 'Search a destination address…'}
          onSelect={handleAddressSelect}
        />
        <span className="hint">…or click on the map. Drag markers to move them.</span>
      </div>

      <section className="layout">
        <div className="map-wrap">
          <MadridMap
            destinations={destinations}
            home={home}
            transitStops={stops}
            focus={focus}
            onMapClick={placePoint}
            onDestinationMove={moveDestination}
            onHomeMove={updateHome}
            reachableArea={reachable.area}
          />
        </div>
        <aside className="sidebar">
          <section className="panel">
            <div className="panel-header">
              <h2>Places</h2>
              <button type="button" onClick={resetAll} disabled={destinations.length === 0 && !home}>
                Clear all
              </button>
            </div>
            {destinations.length === 0 ? <p className="muted">No destinations yet.</p> : null}
            <ol className="place-list">
              {destinations.map((destination, index) => (
                <li key={destination.id}>
                  <span className="badge">{index + 1}</span>
                  <input
                    aria-label={`Name of destination ${index + 1}`}
                    value={destination.label}
                    onChange={(event) => renameDestination(destination.id, event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${destination.label}`}
                    onClick={() => removeDestination(destination.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
            <div className="home-row">
              <span className="badge badge-home">⌂</span>
              <span>{home ? 'Home selected' : 'No home selected'}</span>
              {home ? (
                <button type="button" onClick={() => updateHome(null)}>
                  Clear
                </button>
              ) : null}
            </div>
          </section>
          <ResultsPanel
            loading={isLoading}
            error={error}
            results={results}
            destinations={destinations}
            home={home}
          />
          <section className="panel">
            <div className="panel-header">
              <h2>Reachable area</h2>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={areaSettings.enabled}
                  onChange={(event) => setAreaSettings({ ...areaSettings, enabled: event.target.checked })}
                />
                Show
              </label>
            </div>
            <p className="muted">
              Shows every place you could live and still reach all your destinations within the chosen time, leaving at
              the departure time.
            </p>
            <div className="area-controls">
              <span>Within</span>
              <select
                aria-label="Maximum travel time"
                value={areaSettings.minutes}
                onChange={(event) => setAreaSettings({ ...areaSettings, minutes: Number(event.target.value) })}
              >
                {[15, 20, 30, 45, 60].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
              <span>by</span>
              <select
                aria-label="Travel mode"
                value={areaSettings.mode}
                onChange={(event) =>
                  setAreaSettings({ ...areaSettings, mode: event.target.value as AreaSettings['mode'] })
                }
              >
                <option value="public_transport">public transport</option>
                <option value="driving">car</option>
              </select>
            </div>
            {!areaSettings.enabled ? null : destinations.length === 0 ? (
              <p className="muted">Add a destination first.</p>
            ) : reachable.error ? (
              <p className="error-text">{reachable.error}</p>
            ) : reachable.loading ? (
              <p className="muted">Calculating area…</p>
            ) : reachable.area && reachable.area.length === 0 ? (
              <p className="muted">
                No place reaches {destinations.length > 1 ? 'all destinations' : 'this destination'} in time. Try a
                longer time.
              </p>
            ) : (
              <p className="muted">
                <i className="legend-swatch" /> Green: {destinations.length > 1 ? 'every destination' : 'the destination'}{' '}
                within {areaSettings.minutes} min.
              </p>
            )}
          </section>
        </aside>
      </section>

      <footer className="footer">
        Map data © OpenStreetMap contributors. Travel times: TravelTime. Address search:
        Photon.
      </footer>
    </main>
  )
}

export default App
