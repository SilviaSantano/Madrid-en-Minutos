// Shared client for the TravelTime API (https://traveltime.com). Public transport covers
// Metro, EMT, Cercanías, interurban buses and Metro Ligero.
const baseUrl = 'https://api.traveltimeapp.com/v4'
const appId = import.meta.env.VITE_TRAVELTIME_APP_ID ?? ''
const apiKey = import.meta.env.VITE_TRAVELTIME_API_KEY ?? ''
const requestTimeoutMs = 30000

export type TravelTimeMode = 'public_transport' | 'driving' | 'walking'

// An error whose message is already suitable to show to the user.
export class TravelTimeError extends Error {}

export async function postTravelTime<T>(path: string, body: unknown): Promise<T> {
  if (!appId || !apiKey) {
    throw new TravelTimeError('TravelTime API key missing. Set VITE_TRAVELTIME_APP_ID and VITE_TRAVELTIME_API_KEY in .env.')
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
      throw new TravelTimeError(
        'The TravelTime API key was rejected. Check VITE_TRAVELTIME_APP_ID and VITE_TRAVELTIME_API_KEY.',
      )
    }
    if (response.status === 429) {
      throw new TravelTimeError('Too many requests to TravelTime. Wait a minute and try again.')
    }
    throw new TravelTimeError(data.description ?? `TravelTime error (HTTP ${response.status}).`)
  }
  return data
}

export function describeTravelTimeError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'The routing service took too long to answer.'
  }
  if (error instanceof TravelTimeError) {
    return error.message
  }
  return 'Could not reach the routing service. Check your connection and try again.'
}
