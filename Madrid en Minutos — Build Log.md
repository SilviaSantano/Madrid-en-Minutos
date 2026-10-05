# Madrid en Minutos — Build Log


## Overview

Madrid en Minutos helps you choose where to live in Madrid by showing how long it really takes to reach up to 4 regular places from a candidate home, by public transport, car and on foot. It runs entirely in the browser on free services and needs only one free API key.

| Need | Service | Notes |
| --- | --- | --- |
| Map | Leaflet + OpenFreeMap "Positron" vector style | Free, no key, no limits |
| Travel times and reachable areas | TravelTime API | Free Basic plan, non-commercial, 120 requests/min |
| Address search and lookup | Photon (OpenStreetMap) | Free, no key |
| Stations and line colours | OpenStreetMap via Overpass, prebuilt into a static file | Refreshed with `npm run stops` |

Stack: Vite + React + TypeScript. Status: working locally, in English and Spanish; not yet committed to git or deployed.

## Phase 0 - Starting point

The first version ("Madrid Commute Map (Free Stack)") let you click up to 3 destinations and a home, then showed car and transit times. It used OpenStreetMap tiles, the public OSRM demo for driving, EMT Madrid's API for transit and Overpass for station dots. Moving off Google Maps had been the reason for this stack, but the app did not work well:

- **Wrong transit times:** EMT only plans routes on EMT city buses, with no Metro or Cercanías, and used "now" as the departure time.
- **Home locked behind 3 places:** a home could only be set after placing all 3 destinations, and single places couldn't be removed.
- **Silent failures:** errors left an empty panel, and quick clicks could show stale results.
- **Missing stations:** the Overpass service often failed, so 0 stations appeared.
- **Template leftovers:** unused files, a default page title and slow drawing of about 1,000 station dots.

## Phase 1 — Fixing the foundations

The app was made to work end to end.

- **Map:** confirmed the OpenStreetMap tiles worked. A switch to CARTO tiles was tried and reverted, because CARTO now needs a key and shows a watermark.
- **Credentials:** all EMT code and its password were removed, and `.env` was added to `.gitignore`.
- **Interaction:** an explicit "Add destination / Set home" switch was added, home works with 1–3 places, and places can be renamed, removed and dragged. Places are saved in the browser.
- **Address search:** added with Photon, the free OpenStreetMap geocoder, biased to Madrid.
- **Robustness:** each travel mode fails on its own with a readable message, requests time out, and only the latest click updates the results.
- **Stations:** a script (`npm run stops`) downloads Metro and train stations once into a static file, with fallback servers. The app no longer depends on Overpass while running.
- **Cleanup:** removed template files and set the page title.

## Phase 2 — Finding a public transport source

TravelTime replaced EMT and Transitous because it is the only free option found that covers all of Madrid's public transport.

- **Transitous (tried first):** a free, keyless, community-run journey planner. Testing showed it had Cercanías and interurban buses but no Metro or EMT trips, giving times like 56 minutes on foot for a 20-minute Metro trip.
- **Moovit (ruled out):** enterprise only, with no self-service sign-up.
- **TravelTime (chosen):** free Basic plan, with no credit card. It covers Metro, EMT, Cercanías, interurban buses and Metro Ligero, and also gives driving times. The key lives in `.env`.
- **Free-plan limits handled:** at most 2 arrival points per search and 10 searches per request, so places are paired up in requests.
- **Madrid time:** the departure time is always read as Madrid time, whatever the computer's time zone.
- **Walking added:** a third mode in every result.
- **Google Maps links:** each result opens the same trip in Google Maps for step-by-step directions.

## Phase 3 — Reachable area

The map can shade everywhere you could live and still reach all your places in time, using TravelTime's time-map service.

- **First version:** one area for a chosen time limit (15–60 min) and mode, plus dashed outlines per place. The outlines were dropped as too noisy.
- **Graded bands:** later shown as three bands, 15, 30 and 45 min, with Transit, Car and Walking options.
- **Clicking inside the area** still places points on the map.

## Phase 4 — Redesign

The interface was rebuilt around a full-screen map.

- **Layout:** full-screen map with a floating panel on desktop and a bottom sheet on phones.
- **Calmer map:** OpenFreeMap's light-grey "Positron" style, rendered through MapLibre inside Leaflet. A fix makes MapLibre work in the built site.
- **Results table:** a row per place and a column per mode, colour-coded by time, with the fastest mode outlined. Tapping a time draws that route on the map and shows its lines as coloured badges.
- **Simpler input:** no mode switch. The first click adds a place, "+ Add place" adds more, and other clicks set the home.
- **Reachable area as a map layer:** a button on the map opens a card with the mode choice and a legend.
- **Stations:** shown only when zoomed in, coloured by line, with line badges. The station file was rebuilt with official Metro, Metro Ligero and Cercanías line colours.

## Phase 5 — Polish

A series of refinements gave the app its name, colours and wording.

- **One colour scale:** the table and the map share green ≤ 15 min, yellow ≤ 30, orange ≤ 45 and red beyond, with a colour key under the table. Cells are coloured by the minutes they show.
- **Distinct bands:** the reachable-area bands use those same colours, replacing three similar shades of green.
- **Panel:** fits its content instead of filling the screen height, with rounder corners and section dividers.
- **Typography:** Plus Jakarta Sans replaced Inter, with sentence-case headings.
- **Name and wording:** renamed to **Madrid en Minutos**, with "Your places", a new intro text and "Enter home address" in the search box.
- **4 places:** the limit was raised from 3 to 4, with requests split to stay within the free plan.
- **Leaving time:** defaults to now in Madrid time, with a picker for later times and a **Now** button.

## Phase 6 — Languages, route lines and details

The app became bilingual and its routes clearer to read.

- **English and Spanish:** an EN | ES switch next to the title. The app starts in the browser's language and remembers the choice. 
- **Route lines by colour:** each part of a public transport route is drawn in its line's official colour, buses in blue and walking as grey dots, with circles at boarding and transfer stops.
- **Route display bug fixed:** switching routes had reused old lines, leaving later parts pale or dotted. Routes now redraw from scratch in their own layer above everything else.
- **Reachable-area card:** the time key moved above the mode buttons, with the text "Areas where you could live and reach all of your places in up to the following time:".
- **Scrollbar:** the panel's scrollbar appears only while scrolling.

## Phase 7 — Deciding between homes

The latest features help compare real homes, not just single points.

- **Street addresses:** a home placed on the map is labelled with its street address, e.g. "Calle de Goya 45, Salamanca", via Photon. Older saved homes get theirs on load.
- **Compare homes:** save up to 3 homes (A, B, C) and compare them side by side for the chosen mode. The table has a row per place and a total one-way time, with the shortest total outlined. Saved homes appear on the map and can be reopened with one click.
- **Nearby stations:** under the home, up to 3 Metro, Metro Ligero or Cercanías stations within 1 km, with line badges and an estimated walking time.
