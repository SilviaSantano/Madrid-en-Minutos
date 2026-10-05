import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Polygon,
  Polyline,
  Popup,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { AreaBand, AreaShape } from '../lib/reachability'
import { lineRefForRide } from '../lib/stops'
import { homeLetter } from '../lib/homes'
import type { Destination, Point, RouteLeg, SavedHome, TransitNetwork } from '../types/commute'
import { LineChip } from './LineChip'

export type SelectedRoute = {
  legs: RouteLeg[]
  // Changes when the user picks a route, so the map only re-frames on purpose.
  fitKey: number
}

type MadridMapProps = {
  destinations: Destination[]
  home: Point | null
  network: TransitNetwork
  focus: Point | null
  route: SelectedRoute | null
  areaBands: AreaBand[] | null
  onMapClick: (point: Point) => void
  onDestinationMove: (id: string, point: Point) => void
  onHomeMove: (point: Point) => void
  savedHomes: SavedHome[]
  onSavedHomeClick: (home: SavedHome) => void
}

// MapLibre loads its worker relative to its own file, which breaks once Vite bundles it,
// so point it at a worker bundle Vite builds for us.
setWorkerUrl(maplibreWorkerUrl)

const madridCenter: Point = { lat: 40.4168, lng: -3.7038 }
// Free vector basemap, no key needed: https://openfreemap.org
const basemapStyle = 'https://tiles.openfreemap.org/styles/positron'
// Stations are only drawn when zoomed in far enough to be useful.
const stationMinZoom = 14

const homeSvg =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>'

const homeIcon = new L.DivIcon({
  className: 'pin pin-home',
  html: `<span>${homeSvg}</span>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
})

function savedHomeIcon(index: number) {
  return new L.DivIcon({
    className: 'pin pin-saved',
    html: `<span>${homeLetter(index)}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function destinationIcon(index: number) {
  return new L.DivIcon({
    className: 'pin pin-place',
    html: `<span>${index + 1}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

function Basemap() {
  const map = useMap()
  useEffect(() => {
    const layer = maplibreGL({ style: basemapStyle })
    layer.addTo(map)
    return () => {
      layer.remove()
    }
  }, [map])
  return null
}

function MapEvents({ onMapClick, onZoom }: { onMapClick: (point: Point) => void; onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    click(event) {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
    zoomend() {
      onZoom(map.getZoom())
    },
  })
  return null
}

// Pans the map to a point chosen from address search.
function FocusOn({ point }: { point: Point | null }) {
  const map = useMap()
  useEffect(() => {
    if (point) {
      map.flyTo(point, Math.max(map.getZoom(), 15))
    }
  }, [map, point])
  return null
}

// Wide screens: room the floating panel takes on the left; narrow screens: the bottom sheet.
function framePadding(map: L.Map): Pick<L.FitBoundsOptions, 'paddingTopLeft' | 'paddingBottomRight'> {
  const wide = map.getContainer().clientWidth > 720
  return {
    paddingTopLeft: wide ? [440, 60] : [40, 60],
    paddingBottomRight: wide ? [60, 60] : [40, 300],
  }
}

// On load, frames the saved places and home so they aren't hidden behind the panel.
function FitInitial({ points }: { points: Point[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { ...framePadding(map), maxZoom: 14, animate: false })
    // Only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

// Frames a route the user selected, leaving room for the floating panel on wide screens.
function FitRoute({ route }: { route: SelectedRoute | null }) {
  const map = useMap()
  const fitKey = route?.fitKey
  useEffect(() => {
    const points = route?.legs.flatMap((leg) => leg.path) ?? []
    if (points.length < 2) return
    map.flyToBounds(L.latLngBounds(points), { ...framePadding(map), maxZoom: 16 })
    // Only re-frame when the user picks a route, not when results refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey])
  return null
}

// Leaflet takes a multi-polygon as a list of polygons, each a list of rings (shell first, then holes).
function toPositions(shapes: AreaShape[]): Point[][][] {
  return shapes.map((shape) => [shape.shell, ...shape.holes])
}

function markerPoint(event: L.LeafletEvent): Point {
  const { lat, lng } = (event.target as L.Marker).getLatLng()
  return { lat, lng }
}

// Green / yellow / orange for 15 / 30 / 45 min, like the table's fast-to-slow colours.
// Keep in sync with the .band-* legend swatches in styles.css.
const bandStyles: Array<{ color: string; fillOpacity: number }> = [
  { color: '#16a34a', fillOpacity: 0.5 },
  { color: '#eab308', fillOpacity: 0.4 },
  { color: '#f97316', fillOpacity: 0.3 },
]

const busColour = '#2563eb'

function routeKey(route: SelectedRoute): string {
  return `${route.fitKey}:${route.legs.map((leg) => `${leg.kind}-${leg.ride ?? ''}-${leg.path.length}`).join('|')}`
}

// Rides in their line's colour (Metro, Metro Ligero, Cercanías; buses in blue), walking as dots.
function legStyle(leg: RouteLeg, lineColours: Record<string, string>): L.PathOptions {
  if (leg.kind === 'walk') return { color: '#475569', weight: 5, opacity: 0.9, dashArray: '1 9', lineCap: 'round' }
  if (leg.kind === 'drive') return { color: '#1e293b', weight: 7, opacity: 1 }
  const ref = leg.ride ? lineRefForRide(leg.ride) : null
  return { color: (ref && lineColours[ref]) || busColour, weight: 7, opacity: 1 }
}

function rideColour(leg: RouteLeg, lineColours: Record<string, string>): string {
  return legStyle(leg, lineColours).color ?? busColour
}

export function MadridMap({
  destinations,
  home,
  network,
  focus,
  route,
  areaBands,
  onMapClick,
  onDestinationMove,
  onHomeMove,
  savedHomes,
  onSavedHomeClick,
}: MadridMapProps) {
  const destinationIcons = useMemo(
    () => Array.from({ length: destinations.length }, (_, index) => destinationIcon(index)),
    [destinations.length],
  )
  const savedHomeIcons = useMemo(
    () => Array.from({ length: savedHomes.length }, (_, index) => savedHomeIcon(index)),
    [savedHomes.length],
  )
  const [zoom, setZoom] = useState(12)

  return (
    <MapContainer center={madridCenter} zoom={12} className="map" preferCanvas zoomControl={false}>
      <Basemap />
      <ZoomControl position="bottomright" />
      <MapEvents onMapClick={onMapClick} onZoom={setZoom} />
      <FocusOn point={focus} />
      <FitRoute route={route} />
      <FitInitial points={home ? [...destinations.map((d) => d.location), home] : destinations.map((d) => d.location)} />

      {/* Largest band first, so shorter bands are drawn on top of the longer ones they sit inside.
          Non-interactive so clicks inside the area still place points. */}
      {/* Own pane below the default overlay pane, so routes always draw on top of the area. */}
      <Pane name="reachable-area" style={{ zIndex: 350 }}>
        {areaBands
          ? areaBands
              .map((band, index) => ({ band, style: bandStyles[index] }))
              .reverse()
              .map(({ band, style }) =>
                band.shapes.length > 0 ? (
                  <Polygon
                    key={band.minutes}
                    positions={toPositions(band.shapes)}
                    interactive={false}
                    pathOptions={{ ...style, weight: 1.5, opacity: 0.9, fillColor: style.color }}
                  />
                ) : null,
              )
          : null}
      </Pane>

      {/* The route gets its own pane above the area and stations. Keyed by its content so a new
          route redraws from scratch: reusing lines from the previous route kept old styles (dots)
          and drew new white casings on top of earlier coloured legs. */}
      <Pane name="route" style={{ zIndex: 450 }}>
        {route ? (
          <Fragment key={routeKey(route)}>
            {/* A white casing under the whole route keeps light line colours (L3 yellow) readable. */}
            {route.legs.map((leg, index) =>
              leg.kind === 'walk' || leg.path.length < 2 ? null : (
                <Polyline
                  key={`casing-${index}`}
                  positions={leg.path}
                  interactive={false}
                  pathOptions={{ color: '#ffffff', weight: 11, opacity: 0.95 }}
                />
              ),
            )}
            {route.legs.map((leg, index) =>
              leg.path.length < 2 ? null : (
                <Polyline
                  key={`leg-${index}`}
                  positions={leg.path}
                  interactive={false}
                  pathOptions={legStyle(leg, network.lineColours)}
                />
              ),
            )}
            {/* Where each ride starts and ends: boarding and transfer stops. */}
            {route.legs.flatMap((leg, index) =>
              leg.kind === 'ride' && leg.path.length > 0
                ? [leg.path[0], leg.path[leg.path.length - 1]].map((point, end) => (
                    <CircleMarker
                      key={`stop-${index}-${end}`}
                      center={point}
                      radius={5}
                      interactive={false}
                      pathOptions={{ color: rideColour(leg, network.lineColours), weight: 3, fillColor: '#ffffff', fillOpacity: 1 }}
                    />
                  ))
                : [],
            )}
          </Fragment>
        ) : null}
      </Pane>

      {zoom >= stationMinZoom
        ? network.stations.map((station) => (
            <CircleMarker
              key={station.id}
              center={station.location}
              radius={6}
              bubblingMouseEvents={false}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: network.lineColours[station.lines[0]] ?? '#64748b',
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="station-popup">
                  <strong>{station.name}</strong>
                  <div className="chips">
                    {station.lines.map((line) => (
                      <LineChip key={line} line={line} colour={network.lineColours[line]} />
                    ))}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))
        : null}

      {/* Saved homes other than the one on show; click one to show it. */}
      {savedHomes.map((saved, index) =>
        home && saved.location.lat === home.lat && saved.location.lng === home.lng ? null : (
          <Marker
            key={saved.id}
            position={saved.location}
            icon={savedHomeIcons[index]}
            title={saved.label ?? undefined}
            eventHandlers={{ click: () => onSavedHomeClick(saved) }}
          />
        ),
      )}

      {home ? (
        <Marker
          position={home}
          icon={homeIcon}
          draggable
          zIndexOffset={1000}
          eventHandlers={{ dragend: (event) => onHomeMove(markerPoint(event)) }}
        />
      ) : null}

      {destinations.map((destination, index) => (
        <Marker
          key={destination.id}
          position={destination.location}
          icon={destinationIcons[index]}
          draggable
          eventHandlers={{ dragend: (event) => onDestinationMove(destination.id, markerPoint(event)) }}
        >
          <Popup>{destination.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
