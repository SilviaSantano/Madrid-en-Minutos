import type { Point, TransitStop } from '../types/commute'
import { haversineMeters } from './geo'

export type NearbyStation = {
  name: string
  lines: string[]
  walkMinutes: number
}

// Streets add roughly a quarter to the straight-line distance; people walk about 80 m a minute.
const detourFactor = 1.25
const walkMetersPerMinute = 80

// The closest Metro, Metro Ligero and Cercanías stations within `maxMeters` in a straight line,
// with an estimated walking time. Stations that OpenStreetMap maps twice (one node per network,
// as at Nuevos Ministerios) are merged by name.
export function nearestStations(home: Point, stations: TransitStop[], limit = 3, maxMeters = 1000): NearbyStation[] {
  const byName = new Map<string, { name: string; lines: Set<string>; meters: number }>()
  for (const station of stations) {
    const meters = haversineMeters(home, station.location)
    if (meters > maxMeters) continue
    const key = station.name.toLocaleLowerCase('es')
    const existing = byName.get(key)
    if (existing) {
      station.lines.forEach((line) => existing.lines.add(line))
      existing.meters = Math.min(existing.meters, meters)
    } else {
      byName.set(key, { name: station.name, lines: new Set(station.lines), meters })
    }
  }
  return [...byName.values()]
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit)
    .map((station) => ({
      name: station.name,
      lines: [...station.lines],
      walkMinutes: Math.max(1, Math.round((station.meters * detourFactor) / walkMetersPerMinute)),
    }))
}
