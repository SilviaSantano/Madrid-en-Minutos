import type { Destination, Point } from '../types/commute'
import { postTravelTime, transportationFor, type TravelTimeMode } from './traveltime'

// One polygon: an outer ring plus optional holes (areas inside that are not reachable).
export type AreaShape = {
  shell: Point[]
  holes: Point[][]
}

// Travel-time limits shown as graded bands on the map, shortest first.
export const areaBands = [15, 30, 45] as const

export type AreaBand = {
  minutes: number
  shapes: AreaShape[]
}

const intersectionId = 'all'

type TimeMapResponse = {
  results: Array<{
    search_id: string
    shapes: AreaShape[]
  }>
}

// For each band, the area from which every destination can be reached within that time,
// leaving at `departure`. The free plan allows at most 10 searches per request, so each band
// is its own request (up to 4 searches plus their intersection), sent in parallel.
export async function fetchReachableArea(
  destinations: Destination[],
  departure: Date,
  mode: TravelTimeMode,
): Promise<AreaBand[]> {
  const multiple = destinations.length > 1
  return Promise.all(
    areaBands.map(async (minutes) => {
      const data = await postTravelTime<TimeMapResponse>('/time-map', {
        arrival_searches: destinations.map((destination) => ({
          id: destination.id,
          coords: destination.location,
          arrival_time: new Date(departure.getTime() + minutes * 60000).toISOString(),
          travel_time: minutes * 60,
          transportation: transportationFor(mode),
        })),
        // An intersection needs at least two searches; with one destination its own area is the answer.
        intersections: multiple
          ? [{ id: intersectionId, search_ids: destinations.map((destination) => destination.id) }]
          : [],
      })
      const id = multiple ? intersectionId : destinations[0].id
      return { minutes, shapes: data.results.find((result) => result.search_id === id)?.shapes ?? [] }
    }),
  )
}
