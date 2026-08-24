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
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { fetchRoute, RouteModel, api, SpotModel, normalizeSpot } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function NavigateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const destNameParam = searchParams.get('name') || 'Destination';
  const destLatParam = parseFloat(searchParams.get('lat') || '16.0218');
  const destLngParam = parseFloat(searchParams.get('lng') || '120.2319');
  const destAddressParam = searchParams.get('address') || 'Pangasinan, Philippines';

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

  const [allSpots, setAllSpots] = useState<SpotModel[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

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
      setUserLocation({ lat: 16.0218, lng: 120.2319 });
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
        setLocError('Using Lingayen Capitol as default start location (GPS permission denied)');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  // 2. Fetch Route from Valhalla
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

  // 3. Render Full-Bleed Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([destination.lat, destination.lng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        markersGroupRef.current = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const group = markersGroupRef.current;

      if (group) group.clearLayers();
      if (polylineLayerRef.current) {
        map.removeLayer(polylineLayerRef.current);
        polylineLayerRef.current = null;
      }

      if (route && route.coordinates.length > 0) {
        const latLngs = route.coordinates.map((c) => [c[0], c[1]] as [number, number]);

        const polyline = L.polyline(latLngs, {
          color: avoidCongested ? '#2D6A4F' : '#0284C7',
          weight: 6,
          opacity: 0.9,
        }).addTo(map);

        polylineLayerRef.current = polyline;

        // Start location pin
        if (userLocation) {
          L.circleMarker([userLocation.lat, userLocation.lng], {
            radius: 8,
            color: '#582F0E',
            fillColor: '#FFB703',
            fillOpacity: 1,
            weight: 3,
          }).bindPopup('<b>Starting Location</b><br/>Your Current Position').addTo(group);
        }

        // Destination location pin
        L.circleMarker([destination.lat, destination.lng], {
          radius: 9,
          color: '#1B4332',
          fillColor: '#52B788',
          fillOpacity: 1,
          weight: 3,
        }).bindPopup(`<b>${destination.name}</b><br/>${destination.address}`).addTo(group);

        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      } else {
        map.setView([destination.lat, destination.lng], 13);
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [route, destination, userLocation, avoidCongested]);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E3DFD5] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#582F0E] flex items-center justify-center transition cursor-pointer active:scale-95"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#7D5800] uppercase tracking-wider">Independent Navigation</span>
              <span className="px-2 py-0.5 rounded-md bg-[#2D6A4F]/10 text-[#2D6A4F] text-[10px] font-black">
                Valhalla Engine
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-serif text-[#582F0E]">
              Route to {destination.name}
            </h1>
          </div>
        </div>

        {/* Destination Quick Selector Dropdown */}
        {allSpots.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 hidden sm:inline">Change Destination:</span>
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
              className="bg-[#FAF9F5] border border-[#D5C4AC] text-xs font-bold text-[#582F0E] py-2 px-3 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-[#2D6A4F]"
            >
              {allSpots.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.municipality})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Full-Width Split Work Area (Desktop: 2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Route Controls, Metrics, & Maneuver Steps (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Travel Mode Selector */}
          <div className="bg-white p-4 rounded-3xl border border-[#E3DFD5] shadow-xs space-y-3">
            <label className="text-xs font-black text-[#582F0E] uppercase tracking-wider block">
              Select Travel Mode:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'auto', label: 'Driving', icon: Car },
                { id: 'motorcycle', label: 'Motorcycle', icon: RouteIcon },
                { id: 'bicycle', label: 'Bicycle', icon: Bike },
                { id: 'pedestrian', label: 'Eco-Trail', icon: Footprints },
              ].map((m) => {
                const Icon = m.icon;
                const active = costing === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setCosting(m.id as any)}
                    className={`py-3 px-2 rounded-2xl text-xs font-extrabold flex flex-col items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                      active
                        ? 'bg-[#2D6A4F] text-white shadow-md'
                        : 'bg-[#FAF9F5] border border-[#E3DFD5] text-[#582F0E] hover:bg-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Overcrowding Diversion Switch */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#2D6A4F]" />
                <div>
                  <span className="text-xs font-black text-[#582F0E] block">Algorithmic Crowd Diversion</span>
                  <span className="text-[10px] text-gray-600 block">
                    Penalize roads near peak tourist bottlenecks
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAvoidCongested(!avoidCongested)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  avoidCongested ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    avoidCongested ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Route Metrics Summary Card */}
          {route ? (
            <div className="bg-[#FFFDF7] p-5 rounded-3xl border border-[#E8DCB8] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Estimated Trip</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#2D6A4F]">{route.summary.durationFormatted}</span>
                    <span className="text-sm font-extrabold text-[#582F0E]">({route.summary.distanceKm} km)</span>
                  </div>
                </div>

                {route.summary.hasCrowdDiversion && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#2D6A4F] text-white text-xs font-black shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Tranquil Route Active</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <LocateFixed className="w-3.5 h-3.5 text-[#FFB703]" />
                  <span>Start: <b>Current Location / Lingayen</b></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>End: <b>{destination.name}</b></span>
                </div>
              </div>
            </div>
          ) : loadingRoute ? (
            <div className="bg-white p-8 rounded-3xl border border-[#E3DFD5] text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#2D6A4F] mx-auto" />
              <p className="text-xs font-bold text-gray-500">Calculating Valhalla road graph...</p>
            </div>
          ) : null}

          {locError && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{locError}</span>
            </div>
          )}

          {/* Turn-by-Turn Maneuvers List */}
          {route && route.maneuvers.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">
                  Step-by-Step Directions ({route.maneuvers.length} steps)
                </h2>
                <span className="text-[10px] text-gray-400 font-bold">Turn Guidance</span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {route.maneuvers.map((step, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                      activeStepIndex === idx
                        ? 'bg-[#2D6A4F]/10 border-[#2D6A4F]'
                        : 'bg-[#FAF9F5] border-[#E3DFD5] hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-white border border-[#D5C4AC] text-[#582F0E] font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-[#582F0E]">{step.instruction}</p>
                        {step.streetName && (
                          <p className="text-[11px] text-[#7D5800] font-semibold mt-0.5">{step.streetName}</p>
                        )}
                      </div>
                      <span className="text-[11px] font-extrabold text-stone-500 whitespace-nowrap">
                        {step.distanceMeters >= 1000
                          ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                          : `${step.distanceMeters} m`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Full Interactive Map Canvas (7 cols) */}
        <div className="lg:col-span-7 sticky top-20">
          <div className="bg-white p-3 rounded-3xl border border-[#E3DFD5] shadow-md space-y-3">
            <div className="relative rounded-2xl overflow-hidden h-[500px] lg:h-[650px] bg-stone-100 border border-[#D5C4AC]">
              <div ref={mapContainerRef} className="w-full h-full" />

              {loadingRoute && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-xs font-black text-[#2D6A4F] z-10">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span>Computing road network on Azure VM...</span>
                </div>
              )}

              {/* Map Floating HUD */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-2 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#E3DFD5] shadow-lg pointer-events-auto flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#2D6A4F] animate-spin" style={{ animationDuration: '10s' }} />
                  <span className="text-xs font-black text-[#582F0E]">Pangasinan Eco-Map</span>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/95 backdrop-blur-md hover:bg-stone-50 px-3.5 py-2 rounded-2xl border border-[#E3DFD5] shadow-lg pointer-events-auto text-xs font-black text-gray-700 inline-flex items-center gap-1.5 transition active:scale-95"
                >
                  <span>Open External App</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NavigatePage() {
  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to load Navigation page">
        <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-gray-500">Loading Navigation Workspace...</div>}>
          <NavigateContent />
        </Suspense>
      </ErrorBoundary>
    </Navigation>
  );
}
