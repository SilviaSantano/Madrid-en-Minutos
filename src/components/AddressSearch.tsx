import { useEffect, useState } from 'react'
import type { Point } from '../types/commute'

export type AddressResult = {
  id: string
  label: string
  shortLabel: string
  location: Point
}

type PhotonResponse = {
  features: Array<{
    geometry: { coordinates: [number, number] }
    properties: {
      osm_id?: number
      name?: string
      street?: string
      housenumber?: string
      postcode?: string
      district?: string
      city?: string
    }
  }>
}

type AddressSearchProps = {
  placeholder: string
  onSelect: (result: AddressResult) => void
}

// Photon (https://photon.komoot.io) is a free OpenStreetMap geocoder. Results are biased to Madrid.
async function searchAddress(text: string, signal: AbortSignal): Promise<AddressResult[]> {
  const params = new URLSearchParams({
    q: text,
    lat: '40.4168',
    lon: '-3.7038',
    bbox: '-4.2,40.0,-3.3,40.8',
    limit: '6',
  })
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal })
  if (!response.ok) {
    return []
  }
  const data = (await response.json()) as PhotonResponse
  return data.features.map((feature, index) => {
    const p = feature.properties
    const street = [p.street, p.housenumber].filter(Boolean).join(' ')
    const shortLabel = p.name ?? (street || p.district || p.city || 'Selected place')
    const label = [p.name, street, p.district, p.city].filter(Boolean).join(', ')
    const [lng, lat] = feature.geometry.coordinates
    return { id: `${p.osm_id ?? 'x'}-${index}`, label, shortLabel, location: { lat, lng } }
  })
}

export function AddressSearch({ placeholder, onSelect }: AddressSearchProps) {
  const [text, setText] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    const query = text.trim()
    if (query.length < 3) {
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchAddress(query, controller.signal)
        .then((found) => {
          setResults(found)
          setError(false)
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            console.warn('Address search failed', reason)
            setError(true)
          }
        })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [text])

  function choose(result: AddressResult) {
    onSelect(result)
    setText('')
    setResults([])
  }

  const showResults = text.trim().length >= 3

  return (
    <div className="address-search">
      <input
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) choose(results[0])
          if (event.key === 'Escape') setText('')
        }}
      />
      {showResults && (results.length > 0 || error) ? (
        <ul className="address-results">
          {error ? <li className="address-empty">Search is unavailable right now.</li> : null}
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" onClick={() => choose(result)}>
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
