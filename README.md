# Madrid Commute Map

Compare commutes from a candidate home in Madrid to up to 3 places you travel to regularly (work, school, gym…), by car and by public transport. Everything runs in the browser on free services. Only TravelTime needs a (free) key.

## How to use

1. Choose **Add destination**, then click the map or search an address (up to 3).
2. Choose **Set home**, then click or search the candidate home.
3. Read the car and public transport times for each destination. Drag markers to try nearby spots, and change **Departure** to test another time of day.
4. Optionally turn on **Reachable area**. The map shades in green everywhere you could live and still reach *every* destination within the chosen time (15–60 min) by public transport or car, leaving at the departure time.

Places are saved in the browser (`localStorage`), so they survive a reload.

## Stack

| Need | Service | Notes |
| --- | --- | --- |
| Map tiles | [OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) via Leaflet (`react-leaflet`) | Free for light use with attribution. |
| Public transport and driving | [TravelTime API](https://traveltime.com) (`/v4/routes`, and `/v4/time-map` for the reachable area) | Metro, EMT, Cercanías, interurban buses and Metro Ligero, plus driving. Free Basic plan: non-commercial use only, 120 requests/min. Needs a free key. |
| Address search | [Photon](https://photon.komoot.io) | Free OSM geocoder, biased to Madrid. |
| Metro/train stops | OpenStreetMap via Overpass, prebuilt into `public/madrid-stops.json` | Refresh with `npm run stops`. |

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
