import type { Destination, Point } from '../types/commute'
import { postTravelTime, type TravelTimeMode } from './traveltime'

// One polygon: an outer ring plus optional holes (areas inside that are not reachable).
export type AreaShape = {
  shell: Point[]
  holes: Point[][]
}

type TimeMapResponse = {
  results: Array<{
    search_id: string
    shapes: AreaShape[]
  }>
}

const allId = 'all'

// The area from which every destination can be reached in `minutes`, leaving at `departure`.
export async function fetchReachableArea(
  destinations: Destination[],
  departure: Date,
  minutes: number,
  mode: TravelTimeMode,
): Promise<AreaShape[]> {
  const travelTime = minutes * 60
  const arrivalTime = new Date(departure.getTime() + travelTime * 1000).toISOString()
  const data = await postTravelTime<TimeMapResponse>('/time-map', {
    arrival_searches: destinations.map((destination) => ({
      id: destination.id,
      coords: destination.location,
      arrival_time: arrivalTime,
      travel_time: travelTime,
      transportation: { type: mode },
    })),
    // An intersection needs at least two searches; with one destination its area is the answer.
    intersections:
      destinations.length > 1 ? [{ id: allId, search_ids: destinations.map((destination) => destination.id) }] : [],
  })

  const searchId = destinations.length > 1 ? allId : destinations[0].id
  return data.results.find((result) => result.search_id === searchId)?.shapes ?? []
}
