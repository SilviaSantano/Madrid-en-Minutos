import type { Point } from '../types/commute'

// Photon (https://photon.komoot.io): a free OpenStreetMap geocoder, no key needed.
const photonUrl = 'https://photon.komoot.io'

export type AddressResult = {
  id: string
  // Full description for the search results list.
  label: string
  // Short name, used when the result becomes one of your places (e.g. "Hospital La Paz").
  shortLabel: string
  // Street address with area, used for homes (e.g. "Calle de Alcalá 100, Salamanca").
  address: string
  location: Point
}

type PhotonProperties = {
  osm_id?: number
  type?: string
  name?: string
  street?: string
  housenumber?: string
  district?: string
  locality?: string
  city?: string
}

type PhotonResponse = {
  features: Array<{
    geometry: { coordinates: [number, number] }
    properties: PhotonProperties
  }>
}

// "Calle de Alcalá 100, Salamanca"; falls back to the place's name (a square, a park) without a street.
function formatAddress(p: PhotonProperties): string {
  const street = p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : p.name
  const area = p.district ?? p.locality ?? p.city
  return [street, area].filter(Boolean).join(', ')
}

function toResult(feature: PhotonResponse['features'][number], index: number): AddressResult {
  const p = feature.properties
  const street = [p.street, p.housenumber].filter(Boolean).join(' ')
  const [lng, lat] = feature.geometry.coordinates
  return {
    id: `${p.osm_id ?? 'x'}-${index}`,
    label: [p.name, street, p.district, p.city].filter(Boolean).join(', '),
    shortLabel: p.name ?? (street || p.district || p.city || ''),
    address: formatAddress(p),
    location: { lat, lng },
  }
}

// Address search, biased to Madrid.
export async function searchAddress(text: string, signal: AbortSignal): Promise<AddressResult[]> {
  const params = new URLSearchParams({
    q: text,
    lat: '40.4168',
    lon: '-3.7038',
    bbox: '-4.2,40.0,-3.3,40.8',
    limit: '6',
  })
  const response = await fetch(`${photonUrl}/api/?${params}`, { signal })
  if (!response.ok) {
    return []
  }
  const data = (await response.json()) as PhotonResponse
  return data.features.map(toResult)
}

// The street address at a map point, or null if none is found.
export async function reverseGeocode(point: Point, signal: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({ lat: String(point.lat), lon: String(point.lng), limit: '1' })
  const response = await fetch(`${photonUrl}/reverse?${params}`, { signal })
  if (!response.ok) {
    return null
  }
  const data = (await response.json()) as PhotonResponse
  const feature = data.features[0]
  return feature ? formatAddress(feature.properties) || null : null
}
