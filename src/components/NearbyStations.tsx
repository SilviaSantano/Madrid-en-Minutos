import { useI18n } from '../i18n'
import { nearestStations } from '../lib/nearby'
import type { Point, TransitNetwork } from '../types/commute'
import { LineChip } from './LineChip'

// The Metro, Metro Ligero and Cercanías stations within walking distance of a home.
export function NearbyStations({ home, network }: { home: Point; network: TransitNetwork }) {
  const { t } = useI18n()
  if (network.stations.length === 0) return null
  const stations = nearestStations(home, network.stations)

  return (
    <div className="nearby">
      <h3>{t.nearbyStations}</h3>
      {stations.length === 0 ? <p className="muted">{t.noStationsNearby}</p> : null}
      <ul>
        {stations.map((station) => (
          <li key={station.name}>
            <span className="chips">
              {station.lines.map((line) => (
                <LineChip key={line} line={line} colour={network.lineColours[line]} />
              ))}
            </span>
            <span className="nearby-name">{station.name}</span>
            <span className="nearby-walk">{t.walkMinutes(station.walkMinutes)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
