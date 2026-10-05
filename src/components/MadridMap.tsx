import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Marker, Polygon, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { AreaShape } from '../lib/reachability'
import type { Destination, Point, TransitStop } from '../types/commute'

type MadridMapProps = {
  destinations: Destination[]
  home: Point | null
  transitStops: TransitStop[]
  focus: Point | null
  onMapClick: (point: Point) => void
  onDestinationMove: (id: string, point: Point) => void
  onHomeMove: (point: Point) => void
  reachableArea: AreaShape[] | null
}

const madridCenter: Point = { lat: 40.4168, lng: -3.7038 }

const homeIcon = new L.DivIcon({
  className: 'map-pin map-pin-home',
  html: '<span>⌂</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
})

function destinationIcon(index: number) {
  return new L.DivIcon({
    className: 'map-pin map-pin-destination',
    html: `<span>${index + 1}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  })
}

function ClickHandler({ onMapClick }: { onMapClick: (point: Point) => void }) {
  useMapEvents({
    click(event) {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng })
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

// Leaflet takes a multi-polygon as a list of polygons, each a list of rings (shell first, then holes).
function toPositions(shapes: AreaShape[]): Point[][][] {
  return shapes.map((shape) => [shape.shell, ...shape.holes])
}

function markerPoint(event: L.LeafletEvent): Point {
  const { lat, lng } = (event.target as L.Marker).getLatLng()
  return { lat, lng }
}

export function MadridMap({
  destinations,
  home,
  transitStops,
  focus,
  onMapClick,
  onDestinationMove,
  onHomeMove,
  reachableArea,
}: MadridMapProps) {
  const destinationIcons = useMemo(() => [0, 1, 2].map(destinationIcon), [])

  return (
    <div className="map-container">
      <MapContainer center={madridCenter} zoom={12} className="leaflet-map" preferCanvas>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ClickHandler onMapClick={onMapClick} />
        <FocusOn point={focus} />

        {/* Non-interactive so clicks inside the area still place points. */}
        {reachableArea && reachableArea.length > 0 ? (
          <Polygon
            positions={toPositions(reachableArea)}
            interactive={false}
            pathOptions={{ color: '#15803d', weight: 2, fillColor: '#22c55e', fillOpacity: 0.3 }}
          />
        ) : null}

        {transitStops.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={stop.location}
            radius={4}
            pathOptions={{
              color: '#ffffff',
              weight: 1,
              fillColor: stop.mode === 'metro' ? '#2563eb' : '#059669',
              fillOpacity: 0.9,
            }}
          >
            <Popup>{`${stop.name} (${stop.mode === 'metro' ? 'Metro' : 'Train'})`}</Popup>
          </CircleMarker>
        ))}

        {home ? (
          <Marker
            position={home}
            icon={homeIcon}
            draggable
            eventHandlers={{ dragend: (event) => onHomeMove(markerPoint(event)) }}
          >
            <Popup>Candidate home</Popup>
          </Marker>
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
      <div className="map-legend">
        <span>
          <i className="legend-dot legend-metro" /> Metro
        </span>
        <span>
          <i className="legend-dot legend-train" /> Train
        </span>
      </div>
    </div>
  )
}
