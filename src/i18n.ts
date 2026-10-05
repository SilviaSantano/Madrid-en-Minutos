import { createContext, useContext } from 'react'
import type { RoutingErrorCode, TravelMode } from './types/commute'

export type Lang = 'en' | 'es'

const en = {
  appName: 'Madrid en Minutos',
  intro:
    'Thinking of moving? See how long it really takes to reach the places you go to from each home by car, public transport and walking, and then compare them side by side to choose where to live.',
  switchLanguage: 'Cambiar a español',
  expandPanel: 'Expand panel',
  collapsePanel: 'Collapse panel',

  enterHomeAddress: 'Enter home address',
  enterPlaceAddress: 'Enter place address',
  searchUnavailable: 'Search is unavailable right now.',

  yourPlaces: 'Your places',
  placeCount: (count: number, max: number) => `${count} of ${max}`,
  placesEmpty: (max: number) => `Work, school, the gym… Add up to ${max}.`,
  defaultPlaceName: (number: number) => `Place ${number}`,
  placeNameLabel: (number: number) => `Name of place ${number}`,
  remove: (name: string) => `Remove ${name}`,
  clickMapOrSearch: 'Click the map or search an address',
  cancel: 'Cancel',
  addPlace: 'Add place',

  home: 'Home',
  pointOnMap: 'Point on the map',
  findingAddress: 'Finding address…',
  clearHome: 'Clear home',
  homeNeedsPlace: 'Add a place first, then try a home.',
  homeEmpty: 'Click the map or search an address to try a home.',
  nearbyStations: 'Nearby stations',
  noStationsNearby: 'No Metro or Cercanías station within 1 km.',
  walkMinutes: (minutes: number) => `~${minutes} min walk`,
  leavingAt: 'Leaving at',
  now: 'Now',

  travelTimes: 'Travel times',
  place: 'Place',
  modeShort: { transit: 'Transit', driving: 'Car', walking: 'Walking' } satisfies Record<TravelMode, string>,
  modeLong: { transit: 'Public transport', driving: 'Car', walking: 'Walking' } satisfies Record<TravelMode, string>,
  cellLabel: (mode: string, place: string, time: string) => `${mode} to ${place}: ${time}`,
  unavailable: 'unavailable',
  routeTo: 'to',
  walkWholeWay: 'Walk the whole way',
  tapForRoute: 'Tap a time to see the route on the map.',
  colourKey: 'Colour key',
  more: 'more',
  genericError: 'Something went wrong while calculating routes. Please try again.',

  compareHomes: 'Compare homes',
  compareEmpty: 'Save homes you like to compare their travel times side by side.',
  saveHome: 'Save this home',
  showOnMap: 'Show on map',
  removeHome: (name: string) => `Remove ${name}`,
  totalOneWay: 'Total, one way',
  bestHomeHint: 'Outlined: the shortest total.',

  reachableArea: 'Reachable area',
  hideReachableArea: 'Hide reachable area',
  reachableExplanation: 'Areas where you could live and reach all of your places in up to the following time:',
  travelMode: 'Travel mode',
  addPlaceFirst: 'Add a place first.',
  calculating: 'Calculating…',
  areaEmpty: 'Nowhere reaches all your places within 45 min. Try another mode.',

  footer: 'Travel times by TravelTime · Map © OpenFreeMap, OpenStreetMap · Search by Photon',

  routingError: (code: RoutingErrorCode, mode?: TravelMode): string => {
    switch (code) {
      case 'noRoute':
        return mode === 'driving'
          ? 'No driving route found.'
          : mode === 'walking'
            ? 'No walking route found.'
            : 'No public transport route found for this time.'
      case 'keyMissing':
        return 'TravelTime API key missing. Set VITE_TRAVELTIME_APP_ID and VITE_TRAVELTIME_API_KEY in .env.'
      case 'keyRejected':
        return 'The TravelTime API key was rejected. Check VITE_TRAVELTIME_APP_ID and VITE_TRAVELTIME_API_KEY.'
      case 'rateLimited':
        return 'Too many requests to TravelTime. Wait a minute and try again.'
      case 'timeout':
        return 'The routing service took too long to answer.'
      case 'network':
        return 'Could not reach the routing service. Check your connection and try again.'
      case 'service':
        return 'The routing service returned an error. Please try again.'
    }
  },
}

export type Messages = typeof en

const es: Messages = {
  appName: 'Madrid en Minutos',
  intro:
    '¿Piensas mudarte? Mira cuánto tardas de verdad en llegar a tus lugares desde cada casa en coche, en transporte público y a pie, y después compáralas para elegir dónde vivir.',
  switchLanguage: 'Switch to English',
  expandPanel: 'Expandir panel',
  collapsePanel: 'Contraer panel',

  enterHomeAddress: 'Introduce la dirección de casa',
  enterPlaceAddress: 'Introduce la dirección del lugar',
  searchUnavailable: 'La búsqueda no está disponible ahora mismo.',

  yourPlaces: 'Tus lugares',
  placeCount: (count, max) => `${count} de ${max}`,
  placesEmpty: (max) => `Trabajo, colegio, gimnasio… Añade hasta ${max}.`,
  defaultPlaceName: (number) => `Lugar ${number}`,
  placeNameLabel: (number) => `Nombre del lugar ${number}`,
  remove: (name) => `Quitar ${name}`,
  clickMapOrSearch: 'Haz clic en el mapa o busca una dirección',
  cancel: 'Cancelar',
  addPlace: 'Añadir lugar',

  home: 'Casa',
  pointOnMap: 'Punto en el mapa',
  findingAddress: 'Buscando dirección…',
  clearHome: 'Quitar casa',
  homeNeedsPlace: 'Añade primero un lugar y luego prueba una casa.',
  homeEmpty: 'Haz clic en el mapa o busca una dirección para probar una casa.',
  nearbyStations: 'Estaciones cercanas',
  noStationsNearby: 'Ninguna estación de Metro o Cercanías a menos de 1 km.',
  walkMinutes: (minutes) => `~${minutes} min a pie`,
  leavingAt: 'Salida',
  now: 'Ahora',

  travelTimes: 'Tiempos de viaje',
  place: 'Lugar',
  modeShort: { transit: 'Transporte', driving: 'Coche', walking: 'A pie' },
  modeLong: { transit: 'Transporte público', driving: 'Coche', walking: 'A pie' },
  cellLabel: (mode, place, time) => `${mode} hasta ${place}: ${time}`,
  unavailable: 'no disponible',
  routeTo: 'hasta',
  walkWholeWay: 'A pie todo el camino',
  tapForRoute: 'Toca un tiempo para ver la ruta en el mapa.',
  colourKey: 'Leyenda',
  more: 'más',
  genericError: 'Algo ha fallado al calcular las rutas. Vuelve a intentarlo.',

  compareHomes: 'Comparar casas',
  compareEmpty: 'Guarda las casas que te gusten para comparar sus tiempos de viaje.',
  saveHome: 'Guardar esta casa',
  showOnMap: 'Ver en el mapa',
  removeHome: (name) => `Quitar ${name}`,
  totalOneWay: 'Total, solo ida',
  bestHomeHint: 'Con borde: el menor total.',

  reachableArea: 'Zona alcanzable',
  hideReachableArea: 'Ocultar zona alcanzable',
  reachableExplanation: 'Zonas donde podrías vivir y llegar a todos tus lugares en, como máximo, el siguiente tiempo:',
  travelMode: 'Medio de transporte',
  addPlaceFirst: 'Añade primero un lugar.',
  calculating: 'Calculando…',
  areaEmpty: 'Ninguna zona llega a todos tus lugares en 45 min. Prueba con otro medio.',

  footer: 'Tiempos de viaje: TravelTime · Mapa © OpenFreeMap, OpenStreetMap · Búsqueda: Photon',

  routingError: (code, mode) => {
    switch (code) {
      case 'noRoute':
        return mode === 'driving'
          ? 'No hay ruta en coche.'
          : mode === 'walking'
            ? 'No hay ruta a pie.'
            : 'No hay ruta en transporte público a esta hora.'
      case 'keyMissing':
        return 'Falta la clave de TravelTime. Añade VITE_TRAVELTIME_APP_ID y VITE_TRAVELTIME_API_KEY en .env.'
      case 'keyRejected':
        return 'TravelTime ha rechazado la clave. Revisa VITE_TRAVELTIME_APP_ID y VITE_TRAVELTIME_API_KEY.'
      case 'rateLimited':
        return 'Demasiadas consultas a TravelTime. Espera un minuto y vuelve a intentarlo.'
      case 'timeout':
        return 'El servicio de rutas ha tardado demasiado en responder.'
      case 'network':
        return 'No se ha podido conectar con el servicio de rutas. Comprueba tu conexión y vuelve a intentarlo.'
      case 'service':
        return 'El servicio de rutas ha devuelto un error. Vuelve a intentarlo.'
    }
  },
}

export const messages: Record<Lang, Messages> = { en, es }

const storageKey = 'madrid-en-minutos:lang'

// Saved choice first, then the browser's language; English otherwise.
export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    // Storage unavailable.
  }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(storageKey, lang)
  } catch {
    // Ignore: remembering the language is a convenience.
  }
  document.documentElement.lang = lang
}

export const I18nContext = createContext<{ lang: Lang; t: Messages }>({ lang: 'en', t: en })

export function useI18n() {
  return useContext(I18nContext)
}
