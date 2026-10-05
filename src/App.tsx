import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { ChevronDown, ChevronUp, Clock, House, MapPin, Plus, X } from 'lucide-react'
import { I18nContext, initialLang, messages, saveLang, type Lang } from './i18n'
import { AddressSearch } from './components/AddressSearch'
import { MadridMap, type SelectedRoute } from './components/MadridMap'
import { ReachableAreaControl } from './components/ReachableAreaControl'
import { ResultsTable, type RouteSelection } from './components/ResultsTable'
import { reverseGeocode, type AddressResult } from './lib/geocoding'
import { resultFor } from './lib/modes'
import { calculateCommuteResults } from './lib/routing'
import { fetchMadridTransitNetwork } from './lib/stops'
import { madridNow, madridTimeToDate } from './lib/time'
import { useReachableArea, type AreaSettings } from './lib/useReachableArea'
import type { Destination, DestinationCommute, Point, TransitNetwork } from './types/commute'

const maxDestinations = 4
const storageKey = 'madrid-commute-map:v1'

type SavedState = {
  destinations: Destination[]
  home: Point | null
  // Null when the home was placed by clicking the map.
  homeLabel?: string | null
}

function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw) as SavedState
      // Older saves stored the English placeholder; treat it as "placed on the map".
      const homeLabel = parsed.homeLabel === 'Point on the map' ? null : (parsed.homeLabel ?? null)
      return { destinations: parsed.destinations ?? [], home: parsed.home ?? null, homeLabel }
    }
  } catch {
    // Storage unavailable or corrupt: start empty.
  }
  return { destinations: [], home: null }
}

const initialState = loadSavedState()
const hasSavedRoute = initialState.home !== null && initialState.destinations.length > 0

function App() {
  const [destinations, setDestinations] = useState<Destination[]>(initialState.destinations)
  const [home, setHome] = useState<Point | null>(initialState.home)
  const [lang, setLang] = useState<Lang>(initialLang)
  const t = messages[lang]
  const [homeLabel, setHomeLabel] = useState<string | null>(initialState.homeLabel ?? null)
  const [departure, setDeparture] = useState(madridNow)
  // True while the next map click or search result adds a place instead of setting home.
  const [addingPlace, setAddingPlace] = useState(false)
  const [results, setResults] = useState<DestinationCommute[]>([])
  const [isLoading, setIsLoading] = useState(hasSavedRoute)
  const [error, setError] = useState(false)
  const [network, setNetwork] = useState<TransitNetwork>({ stations: [], lineColours: {} })
  const [focus, setFocus] = useState<Point | null>(null)
  const [selection, setSelection] = useState<(RouteSelection & { fitKey: number }) | null>(null)
  const [areaSettings, setAreaSettings] = useState<AreaSettings>({ enabled: false, mode: 'transit' })
  const [sheetOpen, setSheetOpen] = useState(true)
  const departureDate = useMemo(() => madridTimeToDate(departure), [departure])
  const reachable = useReachableArea(destinations, departureDate, areaSettings)
  // Only the most recent request may update the results.
  const latestRequest = useRef(0)
  const scrollbarTimer = useRef<number | undefined>(undefined)
  const addressLookup = useRef<AbortController | null>(null)
  const [findingAddress, setFindingAddress] = useState(false)

  const canAddPlace = destinations.length < maxDestinations
  // With no places yet, the first click always adds one.
  const placing = canAddPlace && (addingPlace || destinations.length === 0)

  useEffect(() => {
    void fetchMadridTransitNetwork().then(setNetwork)
  }, [])

  useEffect(() => {
    saveLang(lang)
    document.title = t.appName
  }, [lang, t])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ destinations, home, homeLabel } satisfies SavedState))
    } catch {
      // Ignore: persistence is a convenience.
    }
  }, [destinations, home, homeLabel])

  async function evaluate(nextHome: Point | null, nextDestinations: Destination[], nextDeparture: string) {
    const requestId = ++latestRequest.current
    if (!nextHome || nextDestinations.length === 0) {
      setResults([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(false)
    try {
      const commuteResults = await calculateCommuteResults(nextHome, nextDestinations, madridTimeToDate(nextDeparture))
      if (requestId === latestRequest.current) {
        setResults(commuteResults)
      }
    } catch (reason) {
      console.error(reason)
      if (requestId === latestRequest.current) {
        setResults([])
        setError(true)
      }
    } finally {
      if (requestId === latestRequest.current) {
        setIsLoading(false)
      }
    }
  }

  // Homes saved before addresses were looked up get theirs on load.
  useEffect(() => {
    if (!initialState.home || initialState.homeLabel) return
    const controller = new AbortController()
    addressLookup.current = controller
    reverseGeocode(initialState.home, controller.signal)
      .then((address) => {
        if (!controller.signal.aborted) setHomeLabel(address)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  // Recalculate saved routes once on load (isLoading starts true in that case).
  useEffect(() => {
    if (!hasSavedRoute) return
    const requestId = ++latestRequest.current
    calculateCommuteResults(initialState.home!, initialState.destinations, departureDate)
      .then((commuteResults) => {
        if (requestId === latestRequest.current) setResults(commuteResults)
      })
      .catch((reason: unknown) => {
        console.error(reason)
        if (requestId === latestRequest.current) setError(true)
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

  // Names a home placed on the map after its street address. Only the latest lookup counts.
  function lookUpHomeAddress(point: Point | null) {
    addressLookup.current?.abort()
    if (!point) {
      setFindingAddress(false)
      return
    }
    const controller = new AbortController()
    addressLookup.current = controller
    setFindingAddress(true)
    reverseGeocode(point, controller.signal)
      .then((address) => {
        if (!controller.signal.aborted) setHomeLabel(address)
      })
      .catch(() => {
        // Keep "Point on the map" if the lookup fails.
      })
      .finally(() => {
        if (!controller.signal.aborted) setFindingAddress(false)
      })
  }

  function updateHome(nextHome: Point | null, label: string | null = null) {
    setHome(nextHome)
    setHomeLabel(label)
    void evaluate(nextHome, destinations, departure)
    lookUpHomeAddress(label === null ? nextHome : null)
  }

  function addPlace(point: Point, label?: string) {
    updateDestinations([
      ...destinations,
      { id: crypto.randomUUID(), label: label || t.defaultPlaceName(destinations.length + 1), location: point },
    ])
    setAddingPlace(false)
  }

  function placePoint(point: Point) {
    if (placing) addPlace(point)
    else updateHome(point)
  }

  function handleAddressSelect(result: AddressResult) {
    if (placing) addPlace(result.location, result.shortLabel)
    else updateHome(result.location, result.address || result.shortLabel)
    setFocus(result.location)
  }

  function moveDestination(id: string, point: Point) {
    updateDestinations(destinations.map((d) => (d.id === id ? { ...d, location: point } : d)))
  }

  function removeDestination(id: string) {
    updateDestinations(destinations.filter((d) => d.id !== id))
  }

  function renameDestination(id: string, label: string) {
    // Labels don't affect routes, so no recalculation is needed.
    setDestinations((previous) => previous.map((d) => (d.id === id ? { ...d, label } : d)))
  }

  function changeDeparture(value: string) {
    if (!value) return
    // Times in the past aren't useful; same-format strings compare chronologically.
    const now = madridNow()
    const next = value < now ? now : value
    setDeparture(next)
    void evaluate(home, destinations, next)
  }

  function selectRoute(next: RouteSelection) {
    setSelection((previous) => ({ ...next, fitKey: (previous?.fitKey ?? 0) + 1 }))
  }

  const selectedCommute = selection ? results.find((r) => r.destinationId === selection.destinationId) : undefined
  const selectedLegs = selection && selectedCommute && !isLoading ? resultFor(selectedCommute, selection.mode).legs : undefined
  const route: SelectedRoute | null =
    selection && selectedLegs ? { legs: selectedLegs, fitKey: selection.fitKey } : null

  // Shows the panel's scrollbar only while it is being scrolled (see .panel.scrolling in styles.css).
  function revealScrollbar(event: UIEvent<HTMLElement>) {
    const panel = event.currentTarget
    panel.classList.add('scrolling')
    window.clearTimeout(scrollbarTimer.current)
    scrollbarTimer.current = window.setTimeout(() => panel.classList.remove('scrolling'), 900)
  }

  const searchPlaceholder = placing ? t.enterPlaceAddress : t.enterHomeAddress

  return (
    <I18nContext.Provider value={{ lang, t }}>
      <main className="app">
        <MadridMap
          destinations={destinations}
          home={home}
          network={network}
          focus={focus}
          route={route}
          areaBands={reachable.bands}
          onMapClick={placePoint}
          onDestinationMove={moveDestination}
          onHomeMove={(point) => updateHome(point)}
        />

        <div className="map-overlay-top-right">
          <ReachableAreaControl
            settings={areaSettings}
            destinationCount={destinations.length}
            loading={reachable.loading}
            error={reachable.error}
            empty={reachable.bands !== null && reachable.bands.every((band) => band.shapes.length === 0)}
            onChange={setAreaSettings}
          />
        </div>

        <aside className={`panel ${sheetOpen ? 'open' : 'closed'}`} onScroll={revealScrollbar}>
          <button
            type="button"
            className="sheet-handle"
            aria-label={sheetOpen ? t.collapsePanel : t.expandPanel}
            onClick={() => setSheetOpen(!sheetOpen)}
          >
            {sheetOpen ? <ChevronDown size={18} aria-hidden /> : <ChevronUp size={18} aria-hidden />}
          </button>

          <header className="panel-header">
            <div className="panel-title-row">
              <h1>{t.appName}</h1>
              <div className="lang-switch" role="group" aria-label={t.switchLanguage}>
                {(['en', 'es'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    lang={option}
                    aria-pressed={lang === option}
                    className={lang === option ? 'active' : ''}
                    onClick={() => setLang(option)}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <p>{t.intro}</p>
          </header>

          <AddressSearch placeholder={searchPlaceholder} onSelect={handleAddressSelect} />

          <section className="section">
            <div className="section-head">
              <h2>{t.yourPlaces}</h2>
              <span className="muted">
                {t.placeCount(destinations.length, maxDestinations)}
              </span>
            </div>
            {destinations.length === 0 ? (
              <p className="muted">{t.placesEmpty(maxDestinations)}</p>
            ) : null}
            <ol className="place-list">
              {destinations.map((destination, index) => (
                <li key={destination.id}>
                  <span className="place-badge">{index + 1}</span>
                  <input
                    aria-label={t.placeNameLabel(index + 1)}
                    value={destination.label}
                    onChange={(event) => renameDestination(destination.id, event.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t.remove(destination.label)}
                    onClick={() => removeDestination(destination.id)}
                  >
                    <X size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
            {placing ? (
              <div className="placing-hint">
                <MapPin size={16} aria-hidden />
                <span>{t.clickMapOrSearch}</span>
                {destinations.length > 0 ? (
                  <button type="button" className="link-button" onClick={() => setAddingPlace(false)}>
                    {t.cancel}
                  </button>
                ) : null}
              </div>
            ) : canAddPlace ? (
              <button type="button" className="add-button" onClick={() => setAddingPlace(true)}>
                <Plus size={16} aria-hidden /> {t.addPlace}
              </button>
            ) : null}
          </section>

          <section className="section">
            <div className="section-head">
              <h2>{t.home}</h2>
            </div>
            {home ? (
              <div className="home-row">
                <span className="home-badge">
                  <House size={15} aria-hidden />
                </span>
                <span className="home-label">{homeLabel ?? (findingAddress ? t.findingAddress : t.pointOnMap)}</span>
                <button type="button" className="icon-button" aria-label={t.clearHome} onClick={() => updateHome(null)}>
                  <X size={16} aria-hidden />
                </button>
              </div>
            ) : (
              <p className="muted">
                {destinations.length === 0 ? t.homeNeedsPlace : t.homeEmpty}
              </p>
            )}
            <label className="departure">
              <Clock size={15} aria-hidden />
              <span>{t.leavingAt}</span>
              <input
                type="datetime-local"
                value={departure}
                min={madridNow()}
                onChange={(event) => changeDeparture(event.target.value)}
              />
              <button type="button" className="link-button" onClick={() => changeDeparture(madridNow())}>
                {t.now}
              </button>
            </label>
          </section>

          {home && destinations.length > 0 ? (
            <section className="section">
              <div className="section-head">
                <h2>{t.travelTimes}</h2>
              </div>
              <ResultsTable
                loading={isLoading}
                error={error}
                results={results}
                destinations={destinations}
                home={home}
                selection={selection}
                lineColours={network.lineColours}
                onSelect={selectRoute}
              />
            </section>
          ) : null}

          <footer className="panel-footer">
            {t.footer}
          </footer>
        </aside>
      </main>
    </I18nContext.Provider>
  )
}

export default App
