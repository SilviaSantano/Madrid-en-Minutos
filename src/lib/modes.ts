import { Car, Footprints, TramFront, type LucideIcon } from 'lucide-react'
import type { DestinationCommute, TravelMode, TravelModeResult } from '../types/commute'

// Display order of the travel modes; labels live in i18n.ts.
export const modes: Array<{ mode: TravelMode; Icon: LucideIcon }> = [
  { mode: 'transit', Icon: TramFront },
  { mode: 'driving', Icon: Car },
  { mode: 'walking', Icon: Footprints },
]

export function resultFor(commute: DestinationCommute, mode: TravelMode): TravelModeResult {
  return mode === 'transit' ? commute.transit : mode === 'driving' ? commute.driving : commute.walking
}
