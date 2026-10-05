# Madrid en Minutos

Compare commutes from a candidate home in Madrid to up to 4 places you travel to regularly (work, school, gym…), by public transport, car and walking. Everything runs in the browser on free services. Only TravelTime needs a (free) key.

## How to use

1. Add up to 4 places you travel to often: the first click on the map adds one, then use **Add place** for more. You can also search an address.
2. Click the map or search an address to try a home; it's labelled with its street address (looked up with Photon). Drag markers to compare nearby spots, and change **Leaving at** to test another time of day.
3. The table shows public transport, car and walking times to each place: green up to 20 min, amber up to 40, red beyond, with the fastest outlined. Tap a time to draw that route on the map.
4. Under **Home**, see the nearest Metro, Metro Ligero and Cercanías stations with their lines and an estimated walk (straight-line distance plus 25%, at 80 m/min).
5. **Save this home** to compare up to 3 candidate homes (A, B, C) side by side: one column per home, a row per place and the total one-way time, for the travel mode you pick. The shortest total is outlined. Click a saved home (in the list, the table header or its map marker) to show it again.
6. Turn on **Reachable area** (top right) to shade everywhere you could live and still reach *every* place within 15, 30 and 45 min, by the mode you choose.

Metro, Metro Ligero and Cercanías stations appear in their line colours when you zoom in.

The app is in English and Spanish: switch with the **EN / ES** button next to the title. It starts in the browser's language and remembers your choice. All text lives in `src/i18n.ts`.

Places are saved in the browser (`localStorage`), so they survive a reload.

## Stack

| Need | Service | Notes |
| --- | --- | --- |
| Basemap | [OpenFreeMap](https://openfreemap.org) "Positron" vector style, via Leaflet + MapLibre (`@maplibre/maplibre-gl-leaflet`) | Free, no key, no usage limits. |
| Public transport and driving | [TravelTime API](https://traveltime.com) (`/v4/routes`, and `/v4/time-map` for the reachable area) | Metro, EMT, Cercanías, interurban buses and Metro Ligero, plus driving. Free Basic plan: non-commercial use only, 120 requests/min. Needs a free key. |
| Address search | [Photon](https://photon.komoot.io) | Free OSM geocoder, biased to Madrid. |
| Stations and line colours | OpenStreetMap via Overpass, prebuilt into `public/madrid-stops.json` | Refresh with `npm run stops`. |

Each result also links to the same trip in Google Maps, for the step-by-step itinerary.

## Setup

Sign up for a free key at [traveltime.com](https://traveltime.com), then:

```bash
cp .env.example .env   # fill in VITE_TRAVELTIME_APP_ID and VITE_TRAVELTIME_API_KEY
```

The key is compiled into the site's JavaScript, so anyone using the live site can see it. On the free plan that only risks your request quota, not money.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run lint
npm run stops    # regenerate public/madrid-stops.json from OpenStreetMap
```

## Deploy

It's a static site, so any static host works. On Cloudflare Pages or Netlify, use build command `npm run build` and output directory `dist`. Set `VITE_TRAVELTIME_APP_ID` and `VITE_TRAVELTIME_API_KEY` as build environment variables.
