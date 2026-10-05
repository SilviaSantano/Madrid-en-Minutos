// Downloads Metro / train stations in Madrid from OpenStreetMap (Overpass API)
// and writes them to public/madrid-stops.json, so the app doesn't depend on
// Overpass at runtime. Run with: npm run stops
import { writeFile } from 'node:fs/promises'

const query = `
[out:json][timeout:60];
(
  node["railway"="station"](40.28,-3.9,40.55,-3.55);
  node["station"="subway"](40.28,-3.9,40.55,-3.55);
);
out;
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
        signal: AbortSignal.timeout(90000),
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

const data = await queryOverpass()
const stops = data.elements
  .filter((element) => element.lat !== undefined && element.lon !== undefined)
  .map((element) => {
    const tags = element.tags ?? {}
    const isMetro = tags.station === 'subway' || tags.subway === 'yes'
    return {
      id: `${element.id}`,
      name: tags.name ?? (isMetro ? 'Metro station' : 'Train station'),
      location: { lat: Number(element.lat.toFixed(6)), lng: Number(element.lon.toFixed(6)) },
      mode: isMetro ? 'metro' : 'train',
    }
  })

await writeFile(new URL('../public/madrid-stops.json', import.meta.url), JSON.stringify(stops))
console.log(`Wrote ${stops.length} stops to public/madrid-stops.json`)
