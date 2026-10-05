import { useEffect, useState } from 'react'
import type { Destination, DestinationCommute, SavedHome } from '../types/commute'
import { calculateCommuteResults } from './routing'

type Fetched = {
  key: string
  results: Record<string, DestinationCommute[]>
}

// Travel times from every saved home to every place, refreshed when any of them or the
// departure time changes. Results are tagged with the request they belong to, so stale
// responses are ignored.
export function useComparison(savedHomes: SavedHome[], destinations: Destination[], departure: Date) {
  const [fetched, setFetched] = useState<Fetched | null>(null)
  const active = savedHomes.length > 0 && destinations.length > 0
  const key = JSON.stringify([
    savedHomes.map((home) => [home.id, home.location]),
    destinations.map((destination) => [destination.id, destination.location]),
    departure.toISOString(),
  ])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    // Wait briefly so dragging a marker sends one round of requests.
    const timer = window.setTimeout(() => {
      Promise.all(
        savedHomes.map(async (home) => [home.id, await calculateCommuteResults(home.location, destinations, departure)] as const),
      ).then((entries) => {
        if (!cancelled) setFetched({ key, results: Object.fromEntries(entries) })
      })
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // `key` captures every input that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key])

  const current = active && fetched?.key === key ? fetched : null
  return {
    results: current?.results ?? null,
    loading: active && current === null,
  }
}
