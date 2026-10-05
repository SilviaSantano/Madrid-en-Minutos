import { areaBands } from './reachability'

// Short form for table cells: "13 min", "1h 46m".
export function compactDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

// Same steps and colours as the reachable-area bands: green up to 15 min, yellow up to 30,
// orange up to 45, red beyond. Uses the rounded minutes shown, so "15 min" is always green.
export function speedClass(seconds: number): string {
  const shown = Math.round(seconds / 60)
  const band = areaBands.findIndex((minutes) => shown <= minutes)
  return band === -1 ? 'beyond' : `band-${band}`
}
