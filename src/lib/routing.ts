import type { Destination, DestinationCommute, Point, TravelModeResult } from '../types/commute'
import { describeTravelTimeError, postTravelTime, type TravelTimeMode } from './traveltime'

type RoutePart = {
  type: string
  mode: string
  distance?: number
  travel_time: number
  line?: string
  coords?: Array<{ lat: number; lng: number }>
}

type RoutesResponse = {
  results?: Array<{
    search_id: string
    locations: Array<{
      id: string
      properties: Array<{
        travel_time: number
        distance?: number
        route?: { parts: RoutePart[] }
      }>
    }>
    unreachable: string[]
  }>
}

function formatSeconds(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

function formatMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function failure(error: string): TravelModeResult {
  return {
    durationText: '-',
    durationValueSeconds: 0,
    distanceText: '-',
    distanceValueMeters: 0,
    error,
  }
}

function haversineMeters(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

// Ride legs report distance 0, so measure them along their coordinates instead.
function partDistance(part: RoutePart): number {
  if (part.distance) return part.distance
  const coords = part.coords ?? []
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    total += haversineMeters(coords[i - 1], coords[i])
  }
  return total
}

// "4 / Argüelles-Pinar de Chamartín (of Consorcio…)" → "Metro 4"
function rideLabel(part: RoutePart): string {
  const line = part.line?.split(' / ')[0]?.trim() ?? ''
  switch (part.mode) {
    case 'rail_underground':
      return `Metro ${line}`.trim()
    case 'bus':
    case 'coach':
      return `Bus ${line}`.trim()
    case 'tram':
      return `Metro Ligero ${line}`.trim()
    case 'rail_overground':
    case 'rail_national':
    case 'train':
      return line || 'Train'
    default:
      return line || part.mode
  }
}

function toResult(
  mode: TravelTimeMode,
  property: { travel_time: number; distance?: number; route?: { parts: RoutePart[] } },
): TravelModeResult {
  const parts = property.route?.parts ?? []
  const rides = parts.filter((part) => part.type === 'public_transport')
  const distance =
    mode === 'public_transport' ? parts.reduce((sum, part) => sum + partDistance(part), 0) : (property.distance ?? 0)
  return {
    durationText: formatSeconds(property.travel_time),
    durationValueSeconds: property.travel_time,
    distanceText: distance > 0 ? formatMeters(distance) : '-',
    distanceValueMeters: distance,
    summary: mode === 'public_transport' ? (rides.length > 0 ? rides.map(rideLabel).join(' → ') : 'Walk') : undefined,
  }
}

const noRouteMessage: Record<TravelTimeMode, string> = {
  public_transport: 'No public transport route found for this time.',
  driving: 'No driving route found.',
  walking: 'No walking route found.',
}

async function requestRoutes(home: Point, destinations: Destination[], departure: Date): Promise<RoutesResponse> {
  // The free plan allows at most 2 arrivals per search, so use one search per mode and destination.
  const searches = (['public_transport', 'driving', 'walking'] as const).flatMap((mode) =>
    destinations.map((destination) => ({
      id: `${mode}:${destination.id}`,
      departure_location_id: 'home',
      arrival_location_ids: [destination.id],
      departure_time: departure.toISOString(),
      properties: mode === 'public_transport' ? ['travel_time', 'route'] : ['travel_time', 'distance'],
      transportation: { type: mode },
    })),
  )
  return postTravelTime<RoutesResponse>('/routes', {
    locations: [
      { id: 'home', coords: home },
      ...destinations.map((destination) => ({ id: destination.id, coords: destination.location })),
    ],
    departure_searches: searches,
  })
}

export async function calculateCommuteResults(
  home: Point,
  destinations: Destination[],
  departure: Date,
): Promise<DestinationCommute[]> {
  let data: RoutesResponse
  try {
    data = await requestRoutes(home, destinations, departure)
  } catch (error) {
    const message = describeTravelTimeError(error)
    return destinations.map((destination) => ({
      destinationId: destination.id,
      destinationLabel: destination.label,
      driving: failure(message),
      transit: failure(message),
      walking: failure(message),
    }))
  }

  const resultFor = (mode: TravelTimeMode, destinationId: string): TravelModeResult => {
    const search = data.results?.find((result) => result.search_id === `${mode}:${destinationId}`)
    const property = search?.locations.find((location) => location.id === destinationId)?.properties[0]
    if (!property) {
      return failure(noRouteMessage[mode])
    }
    return toResult(mode, property)
  }

  return destinations.map((destination) => ({
    destinationId: destination.id,
    destinationLabel: destination.label,
    driving: resultFor('driving', destination.id),
    transit: resultFor('public_transport', destination.id),
    walking: resultFor('walking', destination.id),
  }))
}
