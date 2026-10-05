// The current Madrid time as a datetime-local value ("2026-10-06T08:30"), whatever the browser's time zone.
export function madridNow(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

// Interprets a datetime-local value ("2026-10-06T08:30") as Madrid time, whatever the browser's time zone.
export function madridTimeToDate(value: string): Date {
  const wallClockAsUtc = new Date(`${value}:00Z`)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(wallClockAsUtc)
      .map((part) => [part.type, part.value]),
  )
  const madridWallClock = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return new Date(wallClockAsUtc.getTime() - (madridWallClock - wallClockAsUtc.getTime()))
}
