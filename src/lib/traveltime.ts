import type { RoutingErrorCode } from '../types/commute'

// Shared client for the TravelTime API (https://traveltime.com). Public transport covers
// Metro, EMT, Cercanías, interurban buses and Metro Ligero.
const baseUrl = 'https://api.traveltimeapp.com/v4'
const appId = import.meta.env.VITE_TRAVELTIME_APP_ID ?? ''
const apiKey = import.meta.env.VITE_TRAVELTIME_API_KEY ?? ''
const requestTimeoutMs = 30000

export type TravelTimeMode = 'public_transport' | 'driving' | 'walking'

// Extra minutes added at every change between vehicles. TravelTime's default is 0, which
// assumes you can always step off one train or bus and straight onto the next; in Madrid's
// larger interchanges that made public transport times consistently too short.
const transferBufferSeconds = 180

// The `transportation` object for a request, with the transfer buffer for public transport.
export function transportationFor(mode: TravelTimeMode) {
  return mode === 'public_transport' ? { type: mode, pt_change_delay: transferBufferSeconds } : { type: mode }
}

// A failure with a known cause, so the UI can explain it.
export class TravelTimeError extends Error {
  readonly code: RoutingErrorCode

  constructor(code: RoutingErrorCode, detail?: string) {
    super(detail ?? code)
    this.code = code
  }
}

export async function postTravelTime<T>(path: string, body: unknown): Promise<T> {
  if (!appId || !apiKey) {
    throw new TravelTimeError('keyMissing')
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Application-Id': appId,
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  const data = (await response.json().catch(() => ({}))) as T & { description?: string }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new TravelTimeError('keyRejected')
    }
    if (response.status === 429) {
      throw new TravelTimeError('rateLimited')
    }
    throw new TravelTimeError('service', data.description ?? `HTTP ${response.status}`)
  }
  return data
}

export function travelTimeErrorCode(error: unknown): RoutingErrorCode {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'timeout'
  }
  if (error instanceof TravelTimeError) {
    if (error.code === 'service') console.warn('TravelTime error:', error.message)
    return error.code
  }
  return 'network'
}
