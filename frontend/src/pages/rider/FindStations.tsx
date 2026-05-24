import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  MapPin,
  Navigation,
  Battery,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useStations } from '../../hooks/useStations'
import type { StationCardData } from '../../types'
import type { RiderLocation } from '../../services/stationService'

// ── Station Card ─────────────────────────────────────────────────────────────

function StationCard({ station, index }: { station: StationCardData; index: number }) {
  const handleGetDirections = () => {
    if (station.mapsUrl) window.open(station.mapsUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="p-4 border border-gray-100 rounded-xl hover:border-primary/40 cursor-pointer transition-all duration-200 hover:shadow-md bg-white animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
      role="article"
      aria-label={`${station.name} — ${station.statusLabel}`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug pr-2">{station.name}</h3>
        <Badge variant={station.isOpen ? 'success' : 'destructive'} className="text-xs shrink-0">
          {station.statusLabel}
        </Badge>
      </div>

      <p className="text-xs text-gray-500 mb-3">{station.address}</p>

      <div className="flex items-center justify-between text-xs">
        {station.distanceKm !== null ? (
          <div className="flex items-center gap-1 text-gray-600">
            <Navigation className="w-3.5 h-3.5" />
            <span>{station.distanceKm} km</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-400">
            <Navigation className="w-3.5 h-3.5" />
            <span>—</span>
          </div>
        )}

        <div className={`flex items-center gap-1 ${station.available > 0 ? 'text-success' : 'text-error'}`}>
          <Battery className="w-3.5 h-3.5" />
          <span>{station.available} available</span>
        </div>

        {station.etaMin !== null ? (
          <div className="flex items-center gap-1 text-warning">
            <Clock className="w-3.5 h-3.5" />
            <span>{station.etaMin} min</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>—</span>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3 h-8 text-xs"
        onClick={handleGetDirections}
        disabled={!station.mapsUrl}
        aria-label={`Get directions to ${station.name}`}
      >
        Get Directions
      </Button>
    </div>
  )
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function StationCardSkeleton() {
  return (
    <div className="p-4 border border-gray-100 rounded-xl animate-pulse bg-white" aria-hidden="true">
      <div className="flex items-start justify-between mb-2">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        <div className="h-4 w-10 bg-gray-200 rounded-full" />
      </div>
      <div className="h-3 w-36 bg-gray-200 rounded mb-3" />
      <div className="flex justify-between gap-2">
        <div className="h-3 w-14 bg-gray-200 rounded" />
        <div className="h-3 w-18 bg-gray-200 rounded" />
        <div className="h-3 w-12 bg-gray-200 rounded" />
      </div>
      <div className="h-8 w-full bg-gray-200 rounded-md mt-3" />
    </div>
  )
}

// ── Leaflet Map Hook ─────────────────────────────────────────────────────────

function useLeafletMap(
  mapRef: React.RefObject<HTMLDivElement | null>,
  riderLocation: RiderLocation | null,
) {
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerGroupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const center: L.LatLngTuple = riderLocation
      ? [riderLocation.lat, riderLocation.lng]
      : [-1.9441, 30.0619]

    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    if (riderLocation) {
      const riderIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;
          background:#3B3BA6;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 0 8px rgba(59,59,166,0.5);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      L.marker([riderLocation.lat, riderLocation.lng], { icon: riderIcon })
        .addTo(map)
        .bindPopup('<strong>You are here</strong>')
    }

    markerGroupRef.current = L.layerGroup().addTo(map)
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerGroupRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef])

  const renderPins = (stations: StationCardData[]) => {
    const group = markerGroupRef.current
    const map = mapInstanceRef.current
    if (!group || !map) return

    group.clearLayers()

    stations.forEach((station) => {
      const [lng, lat] = station.coordinates

      const dot = L.divIcon({
        className: '',
        html: `<div style="
          width:12px;height:12px;
          background:${station.isOpen ? '#1D9E75' : '#9CA3AF'};
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 0 5px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

      const popup = `
        <div style="font-family:system-ui,sans-serif;min-width:170px;line-height:1.6;">
          <strong style="font-size:14px;">${station.name}</strong><br/>
          <span style="font-size:12px;color:#6B7280;">${station.address}</span><br/><br/>
          <span style="color:#1D9E75;font-size:12px;">🔋 ${station.available} available</span><br/>
          ${station.distanceKm
            ? `<span style="font-size:12px;">📍 ${station.distanceKm} km · ${station.etaMin} min</span><br/>`
            : ''}
          ${station.mapsUrl
            ? `<br/><a href="${station.mapsUrl}" target="_blank" rel="noopener noreferrer"
                style="font-size:12px;color:#3B3BA6;text-decoration:underline;">
                Get Directions ↗
              </a>`
            : ''}
        </div>
      `

      L.marker([lat, lng], { icon: dot }).addTo(group).bindPopup(popup)
    })

    if (stations.length > 0) {
      const bounds = stations.map((s): L.LatLngTuple => [s.coordinates[1], s.coordinates[0]])
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }

  return { renderPins }
}

// ── Page Component ───────────────────────────────────────────────────────────

export function FindStations() {
  const {
    stations,
    allStations,
    searchQuery,
    riderLocation,
    isLoading,
    error,
    setSearchQuery,
    refresh,
  } = useStations()

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { renderPins } = useLeafletMap(mapContainerRef, riderLocation)

  useEffect(() => {
    if (!isLoading) renderPins(stations)
  }, [stations, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardLayout>
      <div className="space-y-4">

        {/* Page header — consistent with other pages */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find Stations</h1>
          <p className="text-gray-600 mt-1">Locate nearby battery swap stations</p>
        </div>

        {/*
          Two-column grid.
          - The grid row height is driven by whichever column is taller.
          - Left (list): natural/auto height, scrollable internally.
          - Right (map): stretches to match the row with `h-full`,
            capped at viewport height minus navbar+padding so it never
            overflows and causes scrolling under the navbar.
        */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">

          {/* ── Station List (left column) ─────────────────────── */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Search Stations</CardTitle>
                  {!isLoading && (
                    <button
                      onClick={refresh}
                      className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                      aria-label="Refresh station list"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="station-search"
                    placeholder="Search by name or location..."
                    className="pl-9 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search stations by name or location"
                  />
                </div>

                {/* GPS status */}
                {!isLoading && riderLocation && (
                  <div className="flex items-center gap-1.5 text-xs text-success mb-3 px-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                    </span>
                    Showing stations nearest to you
                  </div>
                )}
                {!isLoading && !riderLocation && (
                  <p className="text-xs text-gray-400 mb-3">Enable location to see distances</p>
                )}

                {/* Scrollable station list — max height matches the map panel */}
                <div
                  className="space-y-2.5 overflow-y-auto pr-0.5"
                  style={{ maxHeight: 'calc(100vh - 280px)' }}
                  role="feed"
                  aria-label="Station list"
                >
                  {/* Loading */}
                  {isLoading && (
                    <>
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Locating stations…</span>
                      </div>
                      {[1, 2, 3].map((i) => <StationCardSkeleton key={i} />)}
                    </>
                  )}

                  {/* Error */}
                  {!isLoading && error && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <AlertCircle className="w-9 h-9 text-error/60" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Unable to load stations</p>
                        <p className="text-xs text-gray-500 mt-1">{error}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={refresh}>Try Again</Button>
                    </div>
                  )}

                  {/* Empty */}
                  {!isLoading && !error && stations.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <MapPin className="w-9 h-9 text-gray-300" />
                      {searchQuery ? (
                        <>
                          <p className="text-sm font-medium text-gray-700">No stations match "{searchQuery}"</p>
                          <p className="text-xs text-gray-500">Try a different search term</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-700">No stations found</p>
                          <p className="text-xs text-gray-500">Check back later</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Station cards */}
                  {!isLoading && !error && stations.map((station, idx) => (
                    <StationCard key={station.id} station={station} index={idx} />
                  ))}

                  {/* Filter count */}
                  {!isLoading && !error && stations.length > 0 && searchQuery && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      {stations.length} of {allStations.length} station{allStations.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Map Panel (right column, 2/3 width) ───────────── */}
          <div className="lg:col-span-2">
            {/*
              isolate     → creates a new stacking context so the map's
                            internal z-indices (400+) stay scoped inside
                            and never bleed above the navbar (z-30).
              overflow-hidden on the Card clips Leaflet tile edges cleanly.
              Height = viewport minus navbar (64px) + page padding (32px top
              + 32px bottom) + page header (~80px) + grid gap (~24px) = ~232px.
              Using calc keeps the map flush with the bottom of the viewport.
            */}
            <div
              className="isolate rounded-xl overflow-hidden shadow-sm border border-gray-200"
              style={{ height: 'calc(100vh - 240px)', minHeight: '440px' }}
            >
              {/* Leaflet mount — fills the entire container */}
              <div
                id="station-map"
                ref={mapContainerRef}
                className="w-full h-full"
                aria-label="Interactive station map"
              />

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-[1000]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                    <p className="text-sm text-gray-600">Loading map…</p>
                  </div>
                </div>
              )}

              {/* Station count — top left */}
              {!isLoading && !error && (
                <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-md border border-gray-100">
                  <p className="text-xs font-medium text-gray-700">
                    {stations.length} station{stations.length !== 1 ? 's' : ''} shown
                  </p>
                </div>
              )}

              {/* Legend — bottom right */}
              {!isLoading && (
                <div className="absolute bottom-6 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-100 text-xs flex flex-col gap-1.5">
                  <p className="font-semibold text-gray-700 mb-0.5 text-[11px] uppercase tracking-wide">Legend</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1D9E75] border-2 border-white shadow-sm shrink-0" />
                    <span className="text-gray-600">Open station</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white shadow-sm shrink-0" />
                    <span className="text-gray-600">Closed station</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-[#3B3BA6] border-2 border-white shadow-sm shrink-0" />
                    <span className="text-gray-600">Your location</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
