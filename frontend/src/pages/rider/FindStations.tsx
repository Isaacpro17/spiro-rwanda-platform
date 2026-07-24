import { useState, useEffect, useRef } from 'react'
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
  X,
} from 'lucide-react'
import { useStations } from '../../hooks/useStations'
import type { StationCardData } from '../../types'
import type { RiderLocation } from '../../services/stationService'
import { useLanguage } from '../../contexts/LanguageContext'

// ── OSRM Route Fetcher ────────────────────────────────────────────────────────

async function fetchOsrmRoute(
  from: RiderLocation,
  toLng: number,
  toLat: number,
): Promise<{ latlngs: L.LatLngTuple[]; distanceM: number; durationSec: number } | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const route = json.routes?.[0]
    if (!route) return null
    // OSRM GeoJSON returns [lng, lat]; Leaflet needs [lat, lng]
    const latlngs: L.LatLngTuple[] = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng],
    )
    return { latlngs, distanceM: route.distance, durationSec: route.duration }
  } catch {
    return null
  }
}

// ── Station Card ─────────────────────────────────────────────────────────────

interface StationCardProps {
  station: StationCardData
  index: number
  onDirections: (station: StationCardData) => void
  isActiveRoute: boolean
  isLoadingRoute: boolean
  directionsLoading: boolean
  canGetDirections: boolean
}

function StationCard({
  station,
  index,
  onDirections,
  isActiveRoute,
  isLoadingRoute,
  directionsLoading,
  canGetDirections,
}: StationCardProps) {
  const { t } = useLanguage()

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
          <span>{station.available} {t.rider.stations.available}</span>
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
        variant={isActiveRoute ? 'default' : 'outline'}
        size="sm"
        className="w-full mt-3 h-8 text-xs"
        onClick={() => onDirections(station)}
        disabled={directionsLoading || (!canGetDirections && !isActiveRoute)}
        aria-label={isActiveRoute ? `Clear route to ${station.name}` : `Get directions to ${station.name}`}
      >
        {isLoadingRoute ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Calculating…
          </>
        ) : isActiveRoute ? (
          <>
            <X className="w-3 h-3 mr-1.5" />
            Clear Route
          </>
        ) : !canGetDirections ? (
          'Enable Location for Directions'
        ) : (
          <>
            <Navigation className="w-3 h-3 mr-1.5" />
            {t.rider.stations.getDirections}
          </>
        )}
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

interface RouteResult {
  distanceKm: string
  durationMin: number
}

function useLeafletMap(
  mapRef: React.RefObject<HTMLDivElement | null>,
  riderLocation: RiderLocation | null,
) {
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerGroupRef = useRef<L.LayerGroup | null>(null)
  const riderMarkerRef = useRef<L.Marker | null>(null)
  const routeLayerRef  = useRef<L.Polyline | null>(null)

  // One-time map initialization — never depends on riderLocation because
  // geolocation is async and always null on the first render.
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, { zoomControl: true }).setView([-1.9441, 30.0619], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    markerGroupRef.current = L.layerGroup().addTo(map)
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerGroupRef.current = null
      riderMarkerRef.current = null
      routeLayerRef.current  = null
    }
  }, [mapRef])

  // Separate effect: add/update rider marker whenever location resolves.
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (riderMarkerRef.current) {
      riderMarkerRef.current.remove()
      riderMarkerRef.current = null
    }

    if (!riderLocation) return

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

    riderMarkerRef.current = L.marker([riderLocation.lat, riderLocation.lng], { icon: riderIcon })
      .addTo(map)
      .bindPopup('<strong>You are here</strong>')
  }, [riderLocation])

  // Render station pins.
  // fitToBounds=false when a route is active so the map doesn't jump away from the drawn route.
  // onDoubleClick is called when the rider double-clicks a station marker to trigger directions.
  const renderPins = (
    stations: StationCardData[],
    fitToBounds = true,
    onDoubleClick?: (station: StationCardData) => void,
  ) => {
    const group = markerGroupRef.current
    const map   = mapInstanceRef.current
    if (!group || !map) return

    group.clearLayers()

    stations.forEach((station) => {
      const [lng, lat] = station.coordinates
      const isOpen = station.isOpen

      // Larger clickable marker for easier interaction
      const dot = L.divIcon({
        className: '',
        html: `
          <div style="
            width:16px;height:16px;
            background:${isOpen ? '#1D9E75' : '#9CA3AF'};
            border:2.5px solid white;
            border-radius:50%;
            box-shadow:0 0 8px rgba(0,0,0,0.35);
            cursor:pointer;
            transition:transform 0.15s ease;
          " class="station-dot"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })

      // Rich popup (single-click)
      const popup = `
        <div style="font-family:system-ui,sans-serif;min-width:180px;line-height:1.65;padding:2px 0;">
          <strong style="font-size:14px;">${station.name}</strong><br/>
          <span style="font-size:12px;color:#6B7280;">${station.address}</span><br/><br/>
          <span style="color:#1D9E75;font-size:12px;">🔋 ${station.available} available</span><br/>
          ${station.distanceKm
            ? `<span style="font-size:12px;">📍 ${station.distanceKm} km · ${station.etaMin} min</span>`
            : ''}
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #E5E7EB;font-size:11px;color:#6B7280;display:flex;align-items:center;gap:4px;">
            <span>🖱️</span>
            <span>Double-click the pin for directions</span>
          </div>
        </div>
      `

      // Tooltip shown on hover — station name only
      const tooltipHtml = `
        <div style="font-family:system-ui,sans-serif;font-size:12px;font-weight:600;padding:2px 4px;">
          ${station.name}
          <div style="font-size:10px;font-weight:400;color:#6B7280;margin-top:1px;">Double-click for directions</div>
        </div>
      `

      const marker = L.marker([lat, lng], { icon: dot })
        .addTo(group)
        .bindPopup(popup, { maxWidth: 220 })
        .bindTooltip(tooltipHtml, {
          permanent: false,    // only shows on hover
          direction: 'top',
          offset: [0, -10],
          opacity: 0.97,
          className: 'spiro-station-tooltip',
        })

      // Double-click triggers Get Directions
      if (onDoubleClick) {
        marker.on('dblclick', (e) => {
          L.DomEvent.stopPropagation(e)   // don't zoom the map
          marker.closePopup()
          onDoubleClick(station)
        })
      }
    })

    if (fitToBounds && stations.length > 0) {
      const bounds = stations.map((s): L.LatLngTuple => [s.coordinates[1], s.coordinates[0]])
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }

  const setRoute = async (
    from: RiderLocation,
    toLng: number,
    toLat: number,
  ): Promise<RouteResult | null> => {
    const map = mapInstanceRef.current
    if (!map) return null

    // Remove any previous route polyline
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    const result = await fetchOsrmRoute(from, toLng, toLat)
    if (!result) return null

    routeLayerRef.current = L.polyline(result.latlngs, {
      color: '#2563EB',
      weight: 5,
      opacity: 0.85,
      lineJoin: 'round',
    }).addTo(map)

    // Zoom the map to show the full route with comfortable padding
    map.fitBounds(routeLayerRef.current.getBounds(), { padding: [60, 60] })

    return {
      distanceKm: (result.distanceM / 1000).toFixed(1),
      durationMin: Math.ceil(result.durationSec / 60),
    }
  }

  const clearRoute = () => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }
  }

  return { renderPins, setRoute, clearRoute }
}

// ── Page Component ───────────────────────────────────────────────────────────

interface ActiveDirections {
  stationId:   string
  stationName: string
  distanceKm:  string
  durationMin: number
}

export function FindStations() {
  const { t } = useLanguage()
  const st = t.rider.stations

  const {
    stations,
    allStations,
    searchQuery,
    riderLocation,
    isLoading,
    error,
    setSearchQuery,
    refresh: doRefresh,
  } = useStations()

  const [activeDirections, setActiveDirections] = useState<ActiveDirections | null>(null)
  const [directionsLoading, setDirectionsLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { renderPins, setRoute, clearRoute } = useLeafletMap(mapContainerRef, riderLocation)

  // Re-render station pins whenever stations or loading state changes.
  // When a route is active, skip fitBounds so the map stays on the route view.
  // Always pass handleGetDirections so double-click on any pin works.
  useEffect(() => {
    if (!isLoading) renderPins(stations, activeDirections === null, handleGetDirections)
  }, [stations, isLoading, activeDirections]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGetDirections = async (station: StationCardData) => {
    // Toggle: clicking the active station clears the route
    if (activeDirections?.stationId === station.id) {
      clearRoute()
      setActiveDirections(null)
      return
    }

    if (!riderLocation) return

    setDirectionsLoading(true)
    setRouteError(null)

    // Show station name immediately while route calculates
    setActiveDirections({
      stationId:   station.id,
      stationName: station.name,
      distanceKm:  '…',
      durationMin: 0,
    })

    const [lng, lat] = station.coordinates
    const result = await setRoute(riderLocation, lng, lat)
    setDirectionsLoading(false)

    if (result) {
      setActiveDirections({
        stationId:   station.id,
        stationName: station.name,
        distanceKm:  result.distanceKm,
        durationMin: result.durationMin,
      })
    } else {
      clearRoute()
      setActiveDirections(null)
      setRouteError('Could not calculate route. Check your connection and try again.')
    }
  }

  const handleClearDirections = () => {
    clearRoute()
    setActiveDirections(null)
  }

  const refresh = () => {
    clearRoute()
    setActiveDirections(null)
    setRouteError(null)
    doRefresh()
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">

        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{st.title}</h1>
          <p className="text-gray-600 mt-1">{st.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">

          {/* ── Station List ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{st.searchTitle}</CardTitle>
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
                    placeholder={st.searchPlaceholder}
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
                    {st.nearestToYou}
                  </div>
                )}
                {!isLoading && !riderLocation && (
                  <p className="text-xs text-gray-400 mb-3">{st.enableLocation}</p>
                )}

                {/* Route error */}
                {routeError && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-error/5 border border-error/20 rounded-lg text-xs text-error">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{routeError}</span>
                  </div>
                )}

                {/* Scrollable station list */}
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
                        <span>{st.locating}</span>
                      </div>
                      {[1, 2, 3].map((i) => <StationCardSkeleton key={i} />)}
                    </>
                  )}

                  {/* Error */}
                  {!isLoading && error && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <AlertCircle className="w-9 h-9 text-error/60" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{st.unableToLoad}</p>
                        <p className="text-xs text-gray-500 mt-1">{error}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={refresh}>{st.tryAgain}</Button>
                    </div>
                  )}

                  {/* Empty */}
                  {!isLoading && !error && stations.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <MapPin className="w-9 h-9 text-gray-300" />
                      {searchQuery ? (
                        <>
                          <p className="text-sm font-medium text-gray-700">{st.noMatchQuery.replace('{query}', searchQuery)}</p>
                          <p className="text-xs text-gray-500">{st.tryDifferent}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-700">{st.noStations}</p>
                          <p className="text-xs text-gray-500">{st.checkBack}</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Station cards */}
                  {!isLoading && !error && stations.map((station, idx) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      index={idx}
                      onDirections={handleGetDirections}
                      isActiveRoute={activeDirections?.stationId === station.id}
                      isLoadingRoute={directionsLoading && activeDirections?.stationId === station.id}
                      directionsLoading={directionsLoading}
                      canGetDirections={riderLocation !== null}
                    />
                  ))}

                  {/* Filter count */}
                  {!isLoading && !error && stations.length > 0 && searchQuery && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      {st.ofTotal
                        .replace('{shown}', String(stations.length))
                        .replace('{total}', String(allStations.length))}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Map Panel ─────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div
              className="isolate rounded-xl overflow-hidden shadow-sm border border-gray-200"
              style={{ height: 'calc(100vh - 240px)', minHeight: '440px' }}
            >
              {/* Leaflet mount */}
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
                    <p className="text-sm text-gray-600">{st.loadingMap}</p>
                  </div>
                </div>
              )}

              {/* Station count — top left */}
              {!isLoading && !error && (
                <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-md border border-gray-100">
                  <p className="text-xs font-medium text-gray-700">
                    {(stations.length !== 1 ? st.stationCountPlural : st.stationCount).replace('{n}', String(stations.length))}
                  </p>
                </div>
              )}

              {/* Active route info — top right */}
              {activeDirections && (
                <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-lg border border-blue-200 max-w-[220px]">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate leading-snug">
                        {activeDirections.stationName}
                      </p>
                      {activeDirections.distanceKm !== '…' ? (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {activeDirections.distanceKm} km · {activeDirections.durationMin} min
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Calculating…
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleClearDirections}
                      className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
                      aria-label="Clear route"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Legend — bottom right */}
              {!isLoading && (
                <div className="absolute bottom-6 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-100 text-xs flex flex-col gap-1.5">
                  <p className="font-semibold text-gray-700 mb-0.5 text-[11px] uppercase tracking-wide">{st.legend}</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1D9E75] border-2 border-white shadow-sm shrink-0" />
                    <span className="text-gray-600">{st.legendOpen}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white shadow-sm shrink-0" />
                    <span className="text-gray-600">{st.legendClosed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-[#3B3BA6] border-2 border-white shadow-sm shrink-0" />
                    <span className="text-gray-600">{st.legendYou}</span>
                  </div>
                  {activeDirections && (
                    <div className="flex items-center gap-2 pt-0.5 border-t border-gray-100 mt-0.5">
                      <span className="inline-block w-6 h-[3px] rounded-full bg-blue-600 shrink-0" />
                      <span className="text-gray-600">Route</span>
                    </div>
                  )}
                </div>
              )}

              {/* Hover / interaction hint — bottom center */}
              {!isLoading && stations.length > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-black/60 backdrop-blur-sm text-white text-[11px] rounded-full px-3 py-1.5 shadow-md pointer-events-none flex items-center gap-1.5">
                  <span>🖱️</span>
                  <span>Hover a pin to see name · Double-click for directions</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
