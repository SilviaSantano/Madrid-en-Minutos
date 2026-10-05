# Madrid en Minutos

This is a tool I wished existed but couldn't find so I built it myself for personal use.
It compares commutes from a candidate home to up to 4 places you travel to regularly by public transport, car and walking so you can see how long it really takes to reach the places you go to from each home and then compare them side by side to choose where to live. Everything runs in the browser on free services.

Link to the live page: https://silviasantano.github.io/Madrid-en-Minutos/

## How to use

1. Add up to 4 places you travel to often: the first click on the map adds one, then use **Add place** for more. You can also search an address.
2. Click the map or search an address to try a home; it's labelled with its street address. Drag markers to compare nearby spots, and change **Leaving at** to test another time of day.
3. The table shows public transport, car and walking times to each place: green up to 15 min, yellow up to 30, orange up to 45, red beyond (the same colours as the reachable area), with the fastest outlined. Tap a time to draw that route on the map.
4. Under **Home**, see the nearest Metro, Metro Ligero and Cercanías stations with their lines and an estimated walk.
5. **Save this home** to compare up to 3 candidate homes (A, B, C) side by side: one column per home, a row per place and the total one-way time, for the travel mode you pick. The shortest total is outlined. Click a saved home (in the list, the table header or its map marker) to show it again.
6. Turn on **Reachable area** (top right) to shade everywhere you could live and still reach *every* place within 15, 30 and 45 min, by the mode you choose.

Metro, Metro Ligero and Cercanías stations appear in their line colours when you zoom in.

The app is in English and Spanish: switch with the **EN / ES** button next to the title.

## Stack

| Need | Service | Notes |
| --- | --- | --- |
| Basemap | [OpenFreeMap](https://openfreemap.org) "Positron" vector style, via Leaflet + MapLibre (`@maplibre/maplibre-gl-leaflet`) | Free, no key, no usage limits. |
| Public transport, driving and walking | [TravelTime API](https://traveltime.com) (`/v4/routes`, and `/v4/time-map` for the reachable area) | Metro, EMT, Cercanías, interurban buses and Metro Ligero, plus driving and walking. Free Basic plan: non-commercial use only, 120 requests/min. Needs a free key. |
| Address search and street addresses | [Photon](https://photon.komoot.io) | Free OSM geocoder, biased to Madrid. |
| Stations and line colours | OpenStreetMap via Overpass, prebuilt into `public/madrid-stops.json` | Refresh with `npm run stops`. |

Each result also links to the same trip in Google Maps, for the step-by-step itinerary.

## Disclaimer

This project is for personal, non-commercial use only. Travel times come from the free Basic plan of the [TravelTime API](https://traveltime.com), which does not allow commercial use. 
Built with the help of Claude.