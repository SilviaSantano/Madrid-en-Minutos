// Downloads Metro, Metro Ligero and Cercanías stations and lines in Madrid from
// OpenStreetMap (Overpass API) and writes them to public/madrid-stops.json, so the
// app doesn't depend on Overpass at runtime. Run with: npm run stops
import { writeFile } from 'node:fs/promises'

const bbox = '40.28,-3.9,40.55,-3.55'
const networks = new Set(['Metro de Madrid', 'Metro Ligero de Madrid', 'Cercanías Madrid'])

const query = `
[out:json][timeout:120];
(
  node["railway"="station"](${bbox});
  node["station"="subway"](${bbox});
  node["station"="light_rail"](${bbox});
)->.stations;
.stations out;
rel["route"~"^(subway|light_rail|train)$"](${bbox})->.routes;
.routes out body;
node(r.routes)->.stops;
.stops out;
`

// Public Overpass instances are often overloaded (406/429/504), so try mirrors in order.
const endpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function queryOverpass() {
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // overpass-api.de rejects requests without a descriptive User-Agent (HTTP 406).
          'User-Agent': 'madrid-commute-map/1.0 (stop list generator)',
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(180000),
      })
      if (response.ok) {
        return await response.json()
      }
      console.warn(`${endpoint}: HTTP ${response.status}`)
    } catch (error) {
      console.warn(`${endpoint}: ${error.message}`)
    }
  }
  throw new Error('All Overpass endpoints failed')
}

function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

// "L1" → "L1", "C-5" → "C5", "C-2 (CIVIS)" → "C2", "ML1" → "ML1"
function normalizeRef(ref) {
  return ref.replace(/\s*\(.*\)$/, '').replace('-', '').toUpperCase()
}

function normalizeColour(colour) {
  if (!colour) return '#6b7280'
  if (colour === 'white') return '#ffffff'
  if (colour === 'red') return '#dc2626'
  return colour.toLowerCase()
}

const data = await queryOverpass()
const elements = data.elements
const stationNodes = []
const stopNodes = new Map()
const routes = []
for (const element of elements) {
  if (element.type === 'relation') routes.push(element)
}
const routeNodeIds = new Set(routes.flatMap((route) => route.members.filter((m) => m.type === 'node').map((m) => m.ref)))
for (const element of elements) {
  if (element.type !== 'node') continue
  const tags = element.tags ?? {}
  const isStation = tags.railway === 'station' || tags.station === 'subway' || tags.station === 'light_rail'
  if (isStation && !stationNodes.some((s) => s.id === element.id)) stationNodes.push(element)
  if (routeNodeIds.has(element.id)) stopNodes.set(element.id, element)
}

const stations = stationNodes.map((element) => {
  const tags = element.tags ?? {}
  const isMetro = tags.station === 'subway' || tags.station === 'light_rail' || tags.subway === 'yes'
  return {
    id: `${element.id}`,
    name: tags.name ?? (isMetro ? 'Metro station' : 'Train station'),
    location: { lat: Number(element.lat.toFixed(6)), lng: Number(element.lon.toFixed(6)) },
    mode: isMetro ? 'metro' : 'train',
    lines: [],
  }
})

// Attach each line to the stations its stops are nearest to (within 400 m).
const lines = {}
for (const route of routes) {
  const tags = route.tags ?? {}
  if (!networks.has(tags.network) || !tags.ref) continue
  const ref = normalizeRef(tags.ref)
  const colour = normalizeColour(tags.colour)
  lines[ref] ??= colour
  for (const member of route.members) {
    if (member.type !== 'node' || !member.role.startsWith('stop')) continue
    const node = stopNodes.get(member.ref)
    if (!node) continue
    const point = { lat: node.lat, lng: node.lon }
    let nearest = null
    let nearestDistance = 400
    for (const station of stations) {
      const distance = distanceMeters(point, station.location)
      if (distance < nearestDistance) {
        nearest = station
        nearestDistance = distance
      }
    }
    if (nearest && !nearest.lines.includes(ref)) nearest.lines.push(ref)
  }
}

// Sort lines: Metro (L…), Metro Ligero (ML…), then Cercanías (C…), numerically.
const lineOrder = (ref) => (ref.startsWith('ML') ? 1 : ref.startsWith('L') || ref === 'R' ? 0 : 2)
for (const station of stations) {
  station.lines.sort((a, b) => lineOrder(a) - lineOrder(b) || a.localeCompare(b, 'en', { numeric: true }))
}

const output = { lines, stations: stations.filter((station) => station.lines.length > 0 || station.mode === 'metro') }
await writeFile(new URL('../public/madrid-stops.json', import.meta.url), JSON.stringify(output))
console.log(`Wrote ${output.stations.length} stations and ${Object.keys(lines).length} lines to public/madrid-stops.json`)
