'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Navigation as NavIcon,
  Car,
  Bike,
  Footprints,
  Sparkles,
  ShieldCheck,
  MapPin,
  Loader2,
  AlertCircle,
  Route as RouteIcon,
  Compass,
  LocateFixed,
  ExternalLink,
  ListOrdered,
  RotateCw,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { fetchRoute, RouteModel, api, SpotModel, normalizeSpot } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createUserLocationPinHtml, createDestinationPinHtml, createStepPinHtml } from '@/lib/map-icons';
import { MAP_TILE_ATTRIBUTION, MAP_TILE_MAX_ZOOM, MAP_TILE_URL } from '@/lib/map-tiles';
import { MapWorkspacePanel, MobileSnapState, MapWorkspaceTab } from '@/components/MapWorkspacePanel';

function NavigateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const destNameParam = searchParams.get('name') || 'Hundred Islands';
  const destLatParam = parseFloat(searchParams.get('lat') || '16.2045');
  const destLngParam = parseFloat(searchParams.get('lng') || '120.0435');
  const destAddressParam = searchParams.get('address') || 'Alaminos City, Pangasinan';

  const [destination, setDestination] = useState({
    name: destNameParam,
    lat: destLatParam,
    lng: destLngParam,
    address: destAddressParam,
  });

  const [costing, setCosting] = useState<'auto' | 'motorcycle' | 'bicycle' | 'pedestrian'>('auto');
  const [avoidCongested, setAvoidCongested] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [, setLocError] = useState<string | null>(null);

  // Panel state
  const [activeTab, setActiveTab] = useState<'options' | 'guidance'>('options');
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [mobileSnap, setMobileSnap] = useState<MobileSnapState>('half');

  const [routeResult, setRouteResult] = useState<{ key: string; value: RouteModel } | null>(null);
  const routeInputKey = [userLocation?.lat, userLocation?.lng, destination.lat, destination.lng, costing, avoidCongested].join(':');
  const route = routeResult?.key === routeInputKey ? routeResult.value : null;
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const routeRequestId = useRef(0);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const [allSpots, setAllSpots] = useState<SpotModel[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineLayerRef = useRef<any>(null);
  const polylineCasingRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const stepMarkerRef = useRef<any>(null);

  // Update destination if URL searchParams change
  useEffect(() => {
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const name = searchParams.get('name');
    const address = searchParams.get('address');
    if (!isNaN(lat) && !isNaN(lng) && name) {
      setDestination({
        name,
        lat,
        lng,
        address: address || name,
      });
    }
  }, [searchParams]);

  // Load spots for destination quick-select
  useEffect(() => {
    api.get('/spots').then((res) => {
      if (res.data?.success) {
        setAllSpots(res.data.data.map(normalizeSpot));
      }
    }).catch(() => {});
  }, []);

  // 1. Acquire current location
  const acquireLocation = useCallback(() => {
    setLocating(true);
    setLocError(null);

    if (!navigator.geolocation) {
      setUserLocation({ lat: 16.0218, lng: 120.2319 }); // Lingayen Capitol fallback
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setUserLocation({ lat: 16.0218, lng: 120.2319 }); // Default Lingayen Capitol
        setLocError('Using Lingayen Capitol as default origin (GPS permission denied)');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  // 2. Fetch Route from Valhalla backend service
  const loadRoute = useCallback(async () => {
    if (!userLocation) return;
    const requestId = ++routeRequestId.current;
    setLoadingRoute(true);
    setRouteError(null);
    setRouteResult(null);

    try {
      const data = await fetchRoute({
        startLat: userLocation.lat,
        startLng: userLocation.lng,
        endLat: destination.lat,
        endLng: destination.lng,
        costing,
        avoidCongested,
      });
      if (requestId === routeRequestId.current) setRouteResult({ key: routeInputKey, value: data });
    } catch (err: any) {
      if (requestId === routeRequestId.current) {
        setRouteResult(null);
        setRouteError(err.message || 'Could not calculate navigation route.');
      }
    } finally {
      if (requestId === routeRequestId.current) setLoadingRoute(false);
    }
  }, [userLocation, destination, costing, avoidCongested, routeInputKey]);

  useEffect(() => {
    if (userLocation) {
      loadRoute();
    }
  }, [userLocation, loadRoute]);

  // 3. Initialize and Render Full-Viewport Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: true,
        }).setView([destination.lat, destination.lng], 12);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer(MAP_TILE_URL, {
          maxZoom: MAP_TILE_MAX_ZOOM,
          attribution: MAP_TILE_ATTRIBUTION,
        }).addTo(map);

        markersGroupRef.current = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const group = markersGroupRef.current;

      if (group) group.clearLayers();
      if (polylineCasingRef.current) {
        map.removeLayer(polylineCasingRef.current);
        polylineCasingRef.current = null;
      }
      if (polylineLayerRef.current) {
        map.removeLayer(polylineLayerRef.current);
        polylineLayerRef.current = null;
      }

      // Draw polyline route
      if (route && route.coordinates.length > 0) {
        const latLngs = route.coordinates.map((c) => [c[0], c[1]] as [number, number]);

        // Casing polyline for shadow & contrast
        const casing = L.polyline(latLngs, {
          color: '#FFFFFF',
          weight: 9,
          opacity: 0.95,
        }).addTo(map);
        polylineCasingRef.current = casing;

        // Foreground polyline
        const polyline = L.polyline(latLngs, {
          color: avoidCongested ? '#2D6A4F' : '#0284C7',
          weight: 5.5,
          opacity: 1.0,
        }).addTo(map);
        polylineLayerRef.current = polyline;

        // Start location marker (Origin)
        if (userLocation) {
          const originIcon = L.divIcon({
            className: 'leaflet-custom-marker',
            html: createUserLocationPinHtml(),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          L.marker([userLocation.lat, userLocation.lng], { icon: originIcon })
            .bindPopup('<b>Starting Location</b><br/>Your Current Position / Lingayen')
            .addTo(group);
        }

        // Destination location marker
        const destIcon = L.divIcon({
          className: 'leaflet-custom-marker',
          html: createDestinationPinHtml(),
          iconSize: [36, 46],
          iconAnchor: [18, 44],
        });

        L.marker([destination.lat, destination.lng], { icon: destIcon })
          .bindPopup(`<b>${destination.name}</b><br/>${destination.address}`)
          .addTo(group);

        // Smoothly fit bounds
        map.fitBounds(polyline.getBounds().pad(0.15));
      } else {
        map.setView([destination.lat, destination.lng], 13);
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [route, destination, userLocation, avoidCongested]);

  // Handle zooming to a specific maneuver step
  const handleStepClick = useCallback(async (stepIndex: number) => {
    setActiveStepIndex(stepIndex);
    if (!route || !mapInstanceRef.current || !route.coordinates.length) return;

    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;

    const coordIndex = Math.min(
      Math.floor((stepIndex / Math.max(1, route.maneuvers.length - 1)) * (route.coordinates.length - 1)),
      route.coordinates.length - 1
    );
    const targetCoord = route.coordinates[coordIndex];

    if (targetCoord) {
      map.setView([targetCoord[0], targetCoord[1]], 15, { animate: true });

      if (stepMarkerRef.current) {
        map.removeLayer(stepMarkerRef.current);
      }

      const stepIcon = L.divIcon({
        className: 'leaflet-custom-marker',
        html: createStepPinHtml(stepIndex + 1),
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      stepMarkerRef.current = L.marker([targetCoord[0], targetCoord[1]], { icon: stepIcon }).addTo(map);
    }
  }, [route]);

  // Fit bounds helper
  const handleFitRouteBounds = useCallback(() => {
    if (polylineLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(polylineLayerRef.current.getBounds().pad(0.15));
    }
  }, []);

  // Tabs definition for Workspace Panel
  const tabs: MapWorkspaceTab[] = [
    {
      id: 'options',
      label: 'Route',
      icon: RouteIcon,
      badge: route ? route.summary.durationFormatted : null,
    },
    {
      id: 'guidance',
      label: 'Guidance',
      icon: ListOrdered,
      badge: route ? `${route.maneuvers.length}` : null,
    },
  ];

  return (
    <div className="relative w-full h-full flex-1 bg-stone-100 overflow-hidden select-none">
      {/* 1. Edge-to-Edge Full Viewport Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* 2. UNIFIED RESPONSIVE MAP WORKSPACE PANEL */}
      <MapWorkspacePanel
        title={`Route to ${destination.name}`}
        subtitle={destination.address}
        badge={{ label: 'Valhalla Engine', variant: 'emerald' }}
        backButton={{
          onClick: () => router.back(),
          label: 'Back to Explorer',
        }}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'options' | 'guidance')}
        isDesktopCollapsed={isDesktopCollapsed}
        onDesktopCollapseChange={setIsDesktopCollapsed}
        mobileSnap={mobileSnap}
        onMobileSnapChange={setMobileSnap}
        // Floating Top-Right Tools Stack
        floatingTools={
          <>
            <button
              type="button"
              onClick={handleFitRouteBounds}
              title="Fit Full Route Bounds"
              aria-label="Fit full route in view"
              className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <Compass className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={acquireLocation}
              title="Acquire Current Location"
              aria-label="Acquire current GPS location"
              className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <LocateFixed className={`w-5 h-5 ${locating ? 'animate-spin text-[#FFB703]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={loadRoute}
              title="Recalculate Route"
              aria-label="Recalculate route"
              className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <RotateCw className={`w-5 h-5 ${loadingRoute ? 'animate-spin text-[#2D6A4F]' : ''}`} />
            </button>
          </>
        }
        // Mobile Peek Bar Content Slot
        peekContent={
          route ? (
            <div className="flex items-center justify-between gap-2 w-full min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <NavIcon className="w-3.5 h-3.5 text-[#FFB703]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#2D6A4F]">{route.summary.durationFormatted}</span>
                    <span className="text-[10px] text-stone-500 font-bold">({route.summary.distanceKm} km)</span>
                  </div>
                  <p className="text-[10px] text-[#837560] font-semibold truncate leading-tight">
                    To {destination.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('guidance');
                  setMobileSnap('half');
                }}
                className="min-h-[32px] px-2.5 rounded-xl bg-[#2D6A4F] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
              >
                <ListOrdered className="w-3 h-3 text-[#FFB703]" />
                <span>Steps ({route.maneuvers.length})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <NavIcon className="w-3.5 h-3.5 text-[#FFB703]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[#582F0E] truncate">Navigating to {destination.name}</p>
                <p className="text-[10px] text-[#837560] font-semibold truncate leading-tight">
                  {loadingRoute ? 'Calculating route...' : 'Tap to adjust route options'}
                </p>
              </div>
            </div>
          )
        }
      >
        {/* TAB 1: ROUTE OPTIONS & METRICS */}
        {activeTab === 'options' && (
          <div className="space-y-3.5">
            {/* Destination Quick Selector */}
            {allSpots.length > 0 && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#837560] block">Destination</label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-[#2D6A4F] absolute left-3 pointer-events-none" />
                  <select
                    value={destination.name}
                    onChange={(e) => {
                      const selected = allSpots.find((s) => s.name === e.target.value);
                      if (selected) {
                        setDestination({
                          name: selected.name,
                          lat: selected.gpsLat,
                          lng: selected.gpsLng,
                          address: selected.address,
                        });
                      }
                    }}
                    className="w-full bg-[#FAF9F5] border border-[#D5C4AC] text-xs font-bold text-[#582F0E] py-2 pl-9 pr-3 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-[#2D6A4F] truncate"
                  >
                    {allSpots.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.municipality})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Travel Mode Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#837560] block">Travel Costing Mode</label>
              <div className="grid grid-cols-4 gap-1.5 bg-[#FAF9F5] p-1 rounded-2xl border border-[#E3DFD5]">
                {[
                  { id: 'auto', label: 'Driving', icon: Car },
                  { id: 'motorcycle', label: 'Moto', icon: RouteIcon },
                  { id: 'bicycle', label: 'Bike', icon: Bike },
                  { id: 'pedestrian', label: 'Walk', icon: Footprints, title: 'Eco-Trail / Walking' },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = costing === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCosting(m.id as any)}
                      title={m.title || m.label}
                      className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                        active
                          ? 'bg-[#2D6A4F] text-white shadow-xs'
                          : 'text-[#582F0E] hover:bg-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Anti-Crowd Diversion Switch */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#7D5800] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[#582F0E] block leading-tight">Anti-Crowd Diversion</span>
                  <span className="text-[10px] text-[#837560] font-semibold block">
                    Bypasses surging Pangasinan tourist bottlenecks
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAvoidCongested(!avoidCongested)}
                aria-pressed={avoidCongested}
                className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  avoidCongested ? 'bg-[#2D6A4F]' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    avoidCongested ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Route Metric Summary Card */}
            {route && (
              <div className="p-3.5 bg-[#FFFDF7] rounded-2xl border border-[#E8DCB8] space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-[#2D6A4F]">{route.summary.durationFormatted}</span>
                    <span className="text-xs font-bold text-[#582F0E]">({route.summary.distanceKm} km)</span>
                  </div>
                  {route.summary.hasCrowdDiversion && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2D6A4F] text-white text-[10px] font-bold shadow-xs">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Tranquil Route</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E8DCB8]/60 flex items-center justify-between text-[11px]">
                  <span className="text-[#837560] font-semibold">{route.maneuvers.length} Navigation steps ready</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('guidance')}
                    className="text-[#2D6A4F] font-black hover:underline cursor-pointer"
                  >
                    View Guidance →
                  </button>
                </div>
              </div>
            )}

            {/* External Navigation Trigger */}
            <div className="pt-1">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-[#FAF9F5] hover:bg-stone-100 text-[#582F0E] font-bold text-xs border border-[#E3DFD5] flex items-center justify-center gap-2 transition active:scale-95"
              >
                <span>Open in Google Maps fallback</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: TURN GUIDANCE STEPS */}
        {activeTab === 'guidance' && (
          <div className="space-y-3">
            {route ? (
              <>
                <div className="flex items-center justify-between pb-1 border-b border-[#E3DFD5] text-[11px]">
                  <span className="text-[#837560] font-bold">
                    {route.maneuvers.length} Steps • {route.summary.distanceKm} km total
                  </span>
                  <button
                    type="button"
                    onClick={handleFitRouteBounds}
                    className="text-[#2D6A4F] font-bold hover:underline cursor-pointer"
                  >
                    Fit Route View
                  </button>
                </div>

                <div className="space-y-1.5">
                  {route.maneuvers.map((step, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleStepClick(idx)}
                      className={`p-2.5 rounded-2xl border transition cursor-pointer ${
                        activeStepIndex === idx
                          ? 'bg-[#2D6A4F]/10 border-[#2D6A4F]'
                          : 'bg-white border-[#E3DFD5] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#FAF9F5] border border-[#D5C4AC] text-[#582F0E] font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#582F0E] leading-snug">{step.instruction}</p>
                          {step.streetName && (
                            <p className="text-[10px] text-[#7D5800] font-semibold mt-0.5 truncate">{step.streetName}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-extrabold text-stone-500 whitespace-nowrap">
                          {step.distanceMeters >= 1000
                            ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                            : `${step.distanceMeters} m`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-6 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 text-[#582F0E] flex items-center justify-center mx-auto">
                  <ListOrdered className="w-5 h-5 text-[#2D6A4F]" />
                </div>
                <p className="text-xs font-bold text-[#582F0E]">No guidance calculated yet</p>
                <p className="text-[11px] text-[#837560]">
                  {loadingRoute ? 'Calculating navigation steps...' : 'Select your travel mode to generate turn-by-turn guidance.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('options')}
                  className="mt-2 py-1.5 px-3 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold transition cursor-pointer"
                >
                  Configure Route
                </button>
              </div>
            )}
          </div>
        )}
      </MapWorkspacePanel>

      {/* 3. Loading Toast Banner */}
      {loadingRoute && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-[#E3DFD5] shadow-lg flex items-center gap-2 text-xs font-bold text-[#2D6A4F]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Calculating route with the Valhalla engine...</span>
        </div>
      )}

      {/* 4. Error Banner */}
      {routeError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-amber-50/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-200 shadow-lg flex items-center gap-2 text-xs font-bold text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span role="alert">Route guidance is unavailable in this local setup. The map remains usable; retry when the routing engine is running. {routeError}</span>
          <button onClick={loadRoute} className="underline ml-2 font-bold cursor-pointer">Retry</button>
        </div>
      )}
    </div>
  );
}

export default function NavigatePage() {
  return (
    <Navigation fullBleed>
      <ErrorBoundary fallbackTitle="Unable to load Navigation Workspace">
        <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-gray-500">Loading Navigation Workspace...</div>}>
          <NavigateContent />
        </Suspense>
      </ErrorBoundary>
    </Navigation>
  );
}
