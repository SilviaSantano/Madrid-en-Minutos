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
  // Short description of the route, e.g. "Walk → C4b → Bus 621".
  summary?: string
  // Set when the route could not be computed; a human-readable reason.
  error?: string
}

export type DestinationCommute = {
  destinationId: string
  destinationLabel: string
  driving: TravelModeResult
  transit: TravelModeResult
  walking: TravelModeResult
}

export type TransitStop = {
  id: string
  name: string
  location: Point
  mode: 'metro' | 'train'
}

export type ClickMode = 'destination' | 'home'
