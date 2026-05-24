import { api } from '../lib/api'
import type { Station, StationCardData } from '../types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RiderLocation {
  lat: number
  lng: number
}

interface EnrichedStation extends Station {
  distanceKm: string | null
  etaMin: number | null
  mapsUrl: string | null
}

// ── Geolocation ──────────────────────────────────────────────────────────────

function getRiderLocation(): Promise<RiderLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null) // user denied — proceed without geo
    )
  })
}

// ── API ──────────────────────────────────────────────────────────────────────

async function fetchStations(riderLocation: RiderLocation | null): Promise<Station[]> {
  const params: Record<string, string> = { status: 'active' }

  if (riderLocation) {
    params.lat = String(riderLocation.lat)
    params.lng = String(riderLocation.lng)
  }

  return api.get<Station[]>('/stations', { params })
}

// ── Distance & ETA (Haversine) ───────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function enrichWithDistance(station: Station, loc: RiderLocation | null): EnrichedStation {
  if (!loc) return { ...station, distanceKm: null, etaMin: null, mapsUrl: null }

  const [stationLng, stationLat] = station.location.coordinates // GeoJSON [lng, lat]
  const km = haversineKm(loc.lat, loc.lng, stationLat, stationLng)

  return {
    ...station,
    distanceKm: km.toFixed(1),
    etaMin: Math.round((km / 20) * 60), // ~20 km/h motorcycle avg
    mapsUrl: `https://maps.google.com/?q=${stationLat},${stationLng}`,
  }
}

// ── Card Mapping ─────────────────────────────────────────────────────────────

function toCardData(station: EnrichedStation): StationCardData {
  return {
    id: station._id,
    name: station.name,
    address: station.address || 'Kigali, Rwanda',
    isOpen: station.status === 'active',
    statusLabel: station.status === 'active' ? 'Open' : 'Closed',
    available: station.availableBatteries,
    distanceKm: station.distanceKm,
    etaMin: station.etaMin,
    mapsUrl: station.mapsUrl,
    coordinates: station.location.coordinates,
  }
}

// ── Search Filter ────────────────────────────────────────────────────────────

function filterBySearch(cards: StationCardData[], query: string): StationCardData[] {
  const q = query.trim().toLowerCase()
  if (!q) return cards
  return cards.filter(
    (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
  )
}

// ── Public API ───────────────────────────────────────────────────────────────

export const stationService = {
  getRiderLocation,
  fetchStations,

  /** Full pipeline: locate → fetch → enrich → map to card shape */
  async loadStationCards(): Promise<{
    cards: StationCardData[]
    riderLocation: RiderLocation | null
  }> {
    const riderLocation = await getRiderLocation()
    const raw = await fetchStations(riderLocation)
    const cards = raw
      .map((s) => enrichWithDistance(s, riderLocation))
      .map(toCardData)
    return { cards, riderLocation }
  },

  filterBySearch,
}
