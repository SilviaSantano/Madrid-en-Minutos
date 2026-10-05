import { useEffect, useState } from 'react'
import type { Destination, RoutingErrorCode, TravelMode } from '../types/commute'
import { fetchReachableArea, type AreaBand } from './reachability'
import { travelTimeErrorCode } from './traveltime'

export type AreaSettings = {
  enabled: boolean
  mode: TravelMode
}

type Fetched = {
  key: string
  bands: AreaBand[] | null
  error: RoutingErrorCode | null
}

// Fetches the reachable area whenever the destinations, departure or settings change.
// Results are tagged with the request they belong to, so stale responses are ignored.
export function useReachableArea(destinations: Destination[], departure: Date, settings: AreaSettings) {
  const [fetched, setFetched] = useState<Fetched | null>(null)
  const active = settings.enabled && destinations.length > 0
  const key = JSON.stringify([
    destinations.map((destination) => [destination.id, destination.location]),
    departure.toISOString(),
    settings.mode,
  ])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    // Wait briefly so dragging a marker or changing several settings sends one request.
    const timer = window.setTimeout(() => {
      fetchReachableArea(destinations, departure, settings.mode === 'transit' ? 'public_transport' : settings.mode)
        .then((bands) => {
          if (!cancelled) setFetched({ key, bands, error: null })
        })
        .catch((reason: unknown) => {
          if (!cancelled) setFetched({ key, bands: null, error: travelTimeErrorCode(reason) })
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
    // Keep showing the previous area while a new one loads, to avoid flicker.
    bands: active ? (fetched?.bands ?? null) : null,
    error: current?.error ?? null,
    loading: active && current === null,
  }
}
