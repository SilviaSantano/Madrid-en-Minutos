// A small badge in a transit line's colour, e.g. "L6" in grey or "C4" in blue.
export function LineChip({ line, colour }: { line: string; colour?: string }) {
  const background = colour ?? '#e2e8f0'
  return (
    <span className="line-chip" style={{ background, color: readableTextColour(background) }}>
      {line}
    </span>
  )
}

// Dark text on light line colours (L3 yellow, Ramal white), white text otherwise.
function readableTextColour(hex: string): string {
  const value = hex.replace('#', '')
  if (value.length !== 6) return '#0f172a'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.65 ? '#0f172a' : '#ffffff'
}
