import type { Destination, DestinationCommute, Point, TravelModeResult } from '../types/commute'

type ResultsPanelProps = {
  loading: boolean
  error: string | null
  results: DestinationCommute[]
  destinations: Destination[]
  home: Point | null
}

// Opens the same trip in Google Maps, to see the full step-by-step itinerary.
function googleMapsUrl(from: Point, to: Point, mode: 'transit' | 'driving' | 'walking'): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: mode,
  })
  return `https://www.google.com/maps/dir/?${params}`
}

function ModeBlock({ title, item, link }: { title: string; item: TravelModeResult; link: string }) {
  return (
    <div className="mode-block">
      <h4>
        {title}
        <a href={link} target="_blank" rel="noreferrer">
          Google Maps ↗
        </a>
      </h4>
      {item.error ? (
        <p className="error-text">{item.error}</p>
      ) : (
        <>
          <p>
            <strong>{item.durationText}</strong> · {item.distanceText}
          </p>
          {item.summary ? <p className="muted">{item.summary}</p> : null}
        </>
      )}
    </div>
  )
}

export function ResultsPanel({ loading, error, results, destinations, home }: ResultsPanelProps) {
  let body
  if (loading) {
    body = <p className="muted">Calculating routes…</p>
  } else if (error) {
    body = <p className="error-text">{error}</p>
  } else if (destinations.length === 0 || !home) {
    body = (
      <p className="muted">
        {destinations.length === 0 ? 'Add at least one destination' : 'Pick a candidate home'} to see commute times.
      </p>
    )
  } else {
    body = results.map((result) => {
      const index = destinations.findIndex((d) => d.id === result.destinationId)
      const destination = destinations[index]
      if (!destination) return null
      const label = destination.label
      return (
        <article key={result.destinationId} className="result-card">
          <h3>
            <span className="badge">{index + 1}</span> {label}
          </h3>
          <ModeBlock
            title="Public transport"
            item={result.transit}
            link={googleMapsUrl(home, destination.location, 'transit')}
          />
          <ModeBlock title="Car" item={result.driving} link={googleMapsUrl(home, destination.location, 'driving')} />
          <ModeBlock title="On foot" item={result.walking} link={googleMapsUrl(home, destination.location, 'walking')} />
        </article>
      )
    })
  }

  return (
    <section className="panel results-panel">
      <h2>Commute times</h2>
      {body}
    </section>
  )
}
