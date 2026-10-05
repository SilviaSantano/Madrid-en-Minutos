# Madrid Commute Map (Free Stack)

Simple app to compare commute options in Madrid, Spain with a free/open stack.

## Stack

- Map: Leaflet (`react-leaflet`) with free, keyless CARTO Voyager tiles (OpenStreetMap data), falling back to OpenStreetMap tiles
- Driving routes: OSRM public demo service (`router.project-osrm.org`)
- Transit routes: EMT Madrid OpenAPI (`openapi.emtmadrid.es`) travel plan endpoint
- Metro/train stop overlay: Overpass API (OpenStreetMap data)

## Functionality

- Click up to 3 regular destinations.
- Click candidate home locations to evaluate commute.
- For each destination, show:
  - driving time + distance,
  - transit time + distance.
- Render metro/train stops directly on the map.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment file:

   ```bash
   cp .env.example .env
   ```

3. Set your EMT MobilityLabs credentials in `.env`:

   ```bash
   VITE_EMT_EMAIL=your_email
   VITE_EMT_PASSWORD=your_password
   ```

   Notes:
   - Register a free account at [https://mobilitylabs.emtmadrid.es](https://mobilitylabs.emtmadrid.es).
   - The app obtains an `accessToken` by calling EMT login API, then uses that for travel-plan requests.
   - If you have app credentials, you can also set:

     ```bash
     VITE_EMT_CLIENT_ID=...
     VITE_EMT_PASSKEY=...
     ```

4. Start:

   ```bash
   npm run dev
   ```

## Verify

- Build:

  ```bash
  npm run build
  ```

- App behavior:
  - destination selection caps at 3,
  - home click triggers both driving and transit requests,
  - metro/train stop dots appear on map.
