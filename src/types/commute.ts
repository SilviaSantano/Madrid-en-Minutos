export type Point = {
  lat: number
  lng: number
}

export type Destination = {
  id: string
  label: string
  location: Point
}

export type TravelModeResult = {
  durationText: string
  durationValueSeconds: number
  distanceText: string
  distanceValueMeters: number
  // Lines ridden, in order, e.g. ["Metro 2", "Metro 6"]. Public transport only.
  rides?: string[]
  // Route geometry, split into legs so each can be drawn in its own style.
  legs?: RouteLeg[]
  // Set when the route could not be computed.
  error?: RoutingErrorCode
}

export type DestinationCommute = {
  destinationId: string
  destinationLabel: string
  driving: TravelModeResult
  transit: TravelModeResult
  walking: TravelModeResult
}

export type TravelMode = 'transit' | 'driving' | 'walking'

export type RouteLeg = {
  kind: 'walk' | 'ride' | 'drive'
  path: Point[]
  // For rides: the line label, e.g. "Metro 6" or "Bus 146".
  ride?: string
}

// Why a calculation failed; the UI turns these into text in the current language.
export type RoutingErrorCode = 'noRoute' | 'keyMissing' | 'keyRejected' | 'rateLimited' | 'timeout' | 'network' | 'service'

export type TransitStop = {
  id: string
  name: string
  location: Point
  mode: 'metro' | 'train'
  // Line refs serving the station, e.g. ["L1", "L2", "C3"].
  lines: string[]
}

export type TransitNetwork = {
  stations: TransitStop[]
  // Line ref → colour, e.g. { L1: "#67c0dd" }.
  lineColours: Record<string, string>
}
