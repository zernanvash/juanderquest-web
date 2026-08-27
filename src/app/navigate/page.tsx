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
  ArrowLeft,
  Route as RouteIcon,
  Compass,
  LocateFixed,
  ChevronRight,
  ExternalLink,
  ListOrdered,
  X,
  ChevronDown,
  ChevronUp,
  RotateCw,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { fetchRoute, RouteModel, api, SpotModel, normalizeSpot } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const [locError, setLocError] = useState<string | null>(null);

  const [route, setRoute] = useState<RouteModel | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [showDirectionsDrawer, setShowDirectionsDrawer] = useState(true);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

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
        address: address || 'Pangasinan, Philippines',
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
    setLoadingRoute(true);
    setRouteError(null);

    try {
      const data = await fetchRoute({
        startLat: userLocation.lat,
        startLng: userLocation.lng,
        endLat: destination.lat,
        endLng: destination.lng,
        costing,
        avoidCongested,
      });
      setRoute(data);
    } catch (err: any) {
      setRouteError(err.message || 'Could not calculate navigation route.');
    } finally {
      setLoadingRoute(false);
    }
  }, [userLocation, destination, costing, avoidCongested]);

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
          attributionControl: false,
        }).setView([destination.lat, destination.lng], 12);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
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
            className: '',
            html: `<div class="w-8 h-8 rounded-full bg-[#582F0E] text-[#FFB703] font-bold text-xs border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transform hover:scale-110 transition duration-200">🚀</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          L.marker([userLocation.lat, userLocation.lng], { icon: originIcon })
            .bindPopup('<b>Starting Location</b><br/>Your Current Position / Lingayen')
            .addTo(group);
        }

        // Destination location marker
        const destIcon = L.divIcon({
          className: '',
          html: `<div class="w-9 h-9 rounded-full bg-[#2D6A4F] text-white font-bold text-sm border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transform hover:scale-110 transition duration-200">📍</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
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

    // Approximate step coordinate along polyline index
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
        className: '',
        html: `<div class="w-7 h-7 rounded-full bg-[#FFB703] text-[#582F0E] font-black text-xs border-2 border-white shadow-xl flex items-center justify-center animate-bounce">${stepIndex + 1}</div>`,
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

  return (
    <div className="relative w-full h-full flex-1 bg-stone-100 overflow-hidden select-none">
      {/* 1. Edge-to-Edge Full Viewport Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* 2. Top-Left Floating Controls Overlay Panel */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:left-6 z-10 max-w-lg pointer-events-auto transition-all duration-200">
        <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-[#E3DFD5] shadow-xl space-y-3">
          {/* Header Row with Back Button & Collapser */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => router.back()}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#582F0E] flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-[#7D5800] uppercase tracking-wider">Independent Route</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#2D6A4F]/10 text-[#2D6A4F] text-[9px] font-black">
                    Valhalla Engine
                  </span>
                </div>
                <h1 className="text-xs sm:text-sm font-black text-[#582F0E] truncate leading-tight">
                  Route to {destination.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
                className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-600 transition cursor-pointer"
                title={isControlsCollapsed ? 'Expand Controls' : 'Collapse Controls'}
              >
                {isControlsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Controls Body */}
          {!isControlsCollapsed && (
            <div className="space-y-2.5 pt-1 border-t border-[#E3DFD5]/60 animate-in fade-in duration-150">
              {/* Destination Selector Dropdown */}
              {allSpots.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500 shrink-0">Destination:</span>
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
                    className="flex-1 bg-[#FAF9F5] border border-[#D5C4AC] text-xs font-bold text-[#582F0E] py-1.5 px-2.5 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-[#2D6A4F] truncate"
                  >
                    {allSpots.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.municipality})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Travel Mode Selector */}
              <div className="grid grid-cols-4 gap-1.5 bg-[#FAF9F5] p-1 rounded-xl border border-[#E3DFD5]">
                {[
                  { id: 'auto', label: 'Driving', icon: Car },
                  { id: 'motorcycle', label: 'Moto', icon: RouteIcon },
                  { id: 'bicycle', label: 'Bike', icon: Bike },
                  { id: 'pedestrian', label: 'Eco-Trail', icon: Footprints },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = costing === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setCosting(m.id as any)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                        active
                          ? 'bg-[#2D6A4F] text-white shadow-xs'
                          : 'text-[#582F0E] hover:bg-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Overcrowding Diversion Switch */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-[#582F0E] block leading-tight">Anti-Crowd Diversion</span>
                    <span className="text-[9px] text-gray-600 block">
                      Avoid active tourist bottlenecks
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAvoidCongested(!avoidCongested)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                    avoidCongested ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      avoidCongested ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Route Metric Summary */}
              {route && (
                <div className="flex items-center justify-between bg-[#FFFDF7] px-3 py-2 rounded-xl border border-[#E8DCB8]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-[#2D6A4F]">{route.summary.durationFormatted}</span>
                    <span className="text-xs font-semibold text-[#582F0E]">({route.summary.distanceKm} km)</span>
                  </div>
                  {route.summary.hasCrowdDiversion && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2D6A4F] text-white text-[10px] font-bold shadow-xs">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Tranquil Route</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Top-Right Floating Map Tool Controls */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleFitRouteBounds}
          title="Fit Full Route Bounds"
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
        >
          <Compass className="w-5 h-5" />
        </button>

        <button
          onClick={acquireLocation}
          title="Acquire Current Location"
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
        >
          <LocateFixed className={`w-5 h-5 ${locating ? 'animate-spin text-[#FFB703]' : ''}`} />
        </button>

        <button
          onClick={() => setShowDirectionsDrawer(!showDirectionsDrawer)}
          title={showDirectionsDrawer ? 'Hide Directions' : 'Show Directions'}
          className={`w-10 h-10 rounded-xl backdrop-blur-md border border-[#E3DFD5] shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer ${
            showDirectionsDrawer ? 'bg-[#2D6A4F] text-white' : 'bg-white/95 text-[#582F0E] hover:bg-white'
          }`}
        >
          <ListOrdered className="w-5 h-5" />
        </button>
      </div>

      {/* 4. Bottom-Left / Bottom Floating Turn Guidance Drawer */}
      {route && showDirectionsDrawer && (
        <div className="absolute bottom-20 lg:bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:w-96 z-10 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white/98 backdrop-blur-md rounded-2xl p-4 border border-[#E3DFD5] shadow-2xl space-y-3 relative max-h-[380px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E3DFD5]">
              <div className="flex items-center gap-1.5">
                <NavIcon className="w-4 h-4 text-[#2D6A4F]" />
                <h2 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">
                  Turn Guidance ({route.maneuvers.length} steps)
                </h2>
              </div>
              <button
                onClick={() => setShowDirectionsDrawer(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 transition cursor-pointer"
                title="Minimize Drawer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Maneuver Steps List */}
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {route.maneuvers.map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => handleStepClick(idx)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    activeStepIndex === idx
                      ? 'bg-[#2D6A4F]/10 border-[#2D6A4F]'
                      : 'bg-[#FAF9F5] border-[#E3DFD5] hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white border border-[#D5C4AC] text-[#582F0E] font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
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

            {/* External Navigation Trigger */}
            <div className="pt-2 border-t border-[#E3DFD5] flex items-center justify-between gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-[#FAF9F5] hover:bg-stone-100 text-[#582F0E] font-bold text-xs border border-[#E3DFD5] flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>

              <button
                onClick={handleFitRouteBounds}
                className="py-2 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#245740] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <span>Fit Route</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Loading Toast Banner */}
      {loadingRoute && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-[#E3DFD5] shadow-lg flex items-center gap-2 text-xs font-bold text-[#2D6A4F]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Calculating road network on Azure VM...</span>
        </div>
      )}

      {/* 6. Error Banner */}
      {routeError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-amber-50/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-200 shadow-lg flex items-center gap-2 text-xs font-bold text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{routeError}</span>
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
