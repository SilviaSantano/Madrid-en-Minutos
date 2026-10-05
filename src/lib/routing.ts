import type { Destination, DestinationCommute, Point, RouteLeg, RoutingErrorCode, TravelModeResult } from '../types/commute'
import { haversineMeters } from './geo'
import { travelTimeErrorCode, postTravelTime, transportationFor, type TravelTimeMode } from './traveltime'

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

function failure(error: RoutingErrorCode): TravelModeResult {
  return {
    durationText: '-',
    durationValueSeconds: 0,
    distanceText: '-',
    distanceValueMeters: 0,
    error,
  }
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
    case 'light_rail':
      return `Metro Ligero ${line}`.trim()
    case 'rail_overground':
    case 'rail_national':
    case 'train':
      return line || 'Train'
    default:
      return line || part.mode
  }
}

// TravelTime is optimistic at both ends of a public transport trip. Calibrated against Google
// Maps on López Silva 8 → Núñez de Balboa 72 (L5): same 11 min on the train, but Google walks
// 6 + 4 min where TravelTime walks 4.2 + 3.1, and allows ~6 min from reaching the station to the
// train leaving where TravelTime allows 30 s. These allowances close most of that gap.
const walkSlowdown = 0.35 // +35% on walking to and from stops: crossings, traffic lights, entrances
const stationEntrySeconds = 120 // street to platform: entrance, ticket gates, escalators
const firstWaitSeconds = 180 // typical wait for the first train or bus (TravelTime assumes none)
const stationModes = new Set(['rail_underground', 'rail_overground', 'rail_national', 'train', 'tram', 'light_rail'])

function transitAllowanceSeconds(parts: RoutePart[]): number {
  const rides = parts.filter((part) => part.type === 'public_transport')
  if (rides.length === 0) return 0
  const first = parts.indexOf(rides[0])
  const last = parts.indexOf(rides[rides.length - 1])
  const endWalks = [...parts.slice(0, first), ...parts.slice(last + 1)]
  const walkSeconds = endWalks.reduce((sum, part) => sum + part.travel_time, 0)
  return (
    walkSeconds * walkSlowdown + firstWaitSeconds + (stationModes.has(rides[0].mode) ? stationEntrySeconds : 0)
  )
}

function toResult(
  mode: TravelTimeMode,
  property: { travel_time: number; distance?: number; route?: { parts: RoutePart[] } },
): TravelModeResult {
  const parts = property.route?.parts ?? []
  const rides = parts.filter((part) => part.type === 'public_transport')
  const distance =
    mode === 'public_transport' ? parts.reduce((sum, part) => sum + partDistance(part), 0) : (property.distance ?? 0)
  const seconds =
    mode === 'public_transport' ? Math.round(property.travel_time + transitAllowanceSeconds(parts)) : property.travel_time
  return {
    durationText: formatSeconds(seconds),
    durationValueSeconds: seconds,
    distanceText: distance > 0 ? formatMeters(distance) : '-',
    distanceValueMeters: distance,
    rides: mode === 'public_transport' ? rides.map(rideLabel) : undefined,
    legs: parts.map((part): RouteLeg => {
      if (part.type === 'public_transport') return { kind: 'ride', path: part.coords ?? [], ride: rideLabel(part) }
      return { kind: part.mode === 'walk' ? 'walk' : 'drive', path: part.coords ?? [] }
    }),
  }
}

async function requestRoutes(home: Point, destinations: Destination[], departure: Date): Promise<RoutesResponse> {
  // The free plan allows at most 2 arrivals per search and 10 searches per request, so pair
  // up destinations: 4 places × 3 modes fit in 6 searches.
  const pairs: Destination[][] = []
  for (let i = 0; i < destinations.length; i += 2) {
    pairs.push(destinations.slice(i, i + 2))
  }
  const searches = (['public_transport', 'driving', 'walking'] as const).flatMap((mode) =>
    pairs.map((pair, index) => ({
      id: `${mode}:${index}`,
      departure_location_id: 'home',
      arrival_location_ids: pair.map((destination) => destination.id),
      departure_time: departure.toISOString(),
      properties: mode === 'public_transport' ? ['travel_time', 'route'] : ['travel_time', 'distance', 'route'],
      transportation: transportationFor(mode),
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
    const code = travelTimeErrorCode(error)
    return destinations.map((destination) => ({
      destinationId: destination.id,
      destinationLabel: destination.label,
      driving: failure(code),
      transit: failure(code),
      walking: failure(code),
    }))
  }

  const resultFor = (mode: TravelTimeMode, destinationId: string): TravelModeResult => {
    const property = data.results
      ?.filter((result) => result.search_id.startsWith(`${mode}:`))
      .flatMap((result) => result.locations)
      .find((location) => location.id === destinationId)?.properties[0]
    if (!property) {
      return failure('noRoute')
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
