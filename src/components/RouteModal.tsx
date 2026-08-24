'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Navigation as NavIcon,
  Car,
  Bike,
  Footprints,
  Sparkles,
  ShieldCheck,
  MapPin,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Route as RouteIcon,
} from 'lucide-react';
import { fetchRoute, RouteModel } from '@/lib/api';

interface RouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    name: string;
    lat: number;
    lng: number;
    address?: string;
  };
}

export function RouteModal({ isOpen, onClose, destination }: RouteModalProps) {
  const [costing, setCosting] = useState<'auto' | 'motorcycle' | 'bicycle' | 'pedestrian'>('auto');
  const [avoidCongested, setAvoidCongested] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const [route, setRoute] = useState<RouteModel | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineLayerRef = useRef<any>(null);

  // 1. Acquire current location
  const acquireLocation = useCallback(() => {
    setLocating(true);
    setLocError(null);

    if (!navigator.geolocation) {
      // Default to Pangasinan Provincial Capitol (Lingayen) if geolocation unsupported
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
        // Fallback default: Provincial Capitol Lingayen
        setUserLocation({ lat: 16.0218, lng: 120.2319 });
        setLocError('Using Lingayen Capitol as default origin (GPS access denied)');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (isOpen) {
      acquireLocation();
    }
  }, [isOpen, acquireLocation]);

  // 2. Fetch Route from backend Valhalla endpoint
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

  // 3. Render Leaflet Map & Polyline Route
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let isMounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;
      // Import leaflet CSS
      await import('leaflet/dist/leaflet.css');

      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([destination.lat, destination.lng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear previous polyline layers
      if (polylineLayerRef.current) {
        map.removeLayer(polylineLayerRef.current);
        polylineLayerRef.current = null;
      }

      // Add markers and polyline
      if (route && route.coordinates.length > 0) {
        const latLngs = route.coordinates.map((c) => [c[0], c[1]] as [number, number]);

        const polyline = L.polyline(latLngs, {
          color: avoidCongested ? '#2D6A4F' : '#0284C7',
          weight: 5,
          opacity: 0.85,
          dashArray: avoidCongested ? undefined : '5, 10',
        }).addTo(map);

        polylineLayerRef.current = polyline;

        // Origin Marker (Gold dot)
        L.circleMarker([userLocation!.lat, userLocation!.lng], {
          radius: 7,
          color: '#FFB703',
          fillColor: '#FFB703',
          fillOpacity: 1,
        }).addTo(map);

        // Destination Marker (Green dot)
        L.circleMarker([destination.lat, destination.lng], {
          radius: 8,
          color: '#2D6A4F',
          fillColor: '#52B788',
          fillOpacity: 1,
        }).addTo(map);

        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
      } else {
        map.setView([destination.lat, destination.lng], 13);
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [isOpen, route, destination, userLocation, avoidCongested]);

  // Clean up map instance on modal close
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      polylineLayerRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF9F5] rounded-3xl max-w-2xl w-full border border-[#D5C4AC] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-white border-b border-[#E3DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center">
              <NavIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#582F0E]">{destination.name}</h2>
              <p className="text-xs text-[#7D5800] font-semibold">Self-Sovereign Valhalla Route</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Costing Travel Mode Switcher */}
          <div className="flex items-center gap-2">
            {[
              { id: 'auto', label: 'Driving', icon: Car },
              { id: 'motorcycle', label: 'Motorcycle', icon: RouteIcon },
              { id: 'bicycle', label: 'Bicycle', icon: Bike },
              { id: 'pedestrian', label: 'Walk / Trail', icon: Footprints },
            ].map((m) => {
              const Icon = m.icon;
              const active = costing === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setCosting(m.id as any)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    active
                      ? 'bg-[#2D6A4F] text-white shadow-sm'
                      : 'bg-white border border-[#E3DFD5] text-[#582F0E] hover:bg-stone-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Crowd Diversion Toggle */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E3DFD5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
              <div>
                <span className="text-xs font-black text-[#582F0E] block">Algorithmic Crowd Avoidance</span>
                <span className="text-[10px] text-gray-500">Route around active congested Pangasinan tourist bottlenecks</span>
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

          {/* Route Map Container */}
          <div className="relative rounded-2xl overflow-hidden border border-[#D5C4AC] h-56 bg-stone-100 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />
            {loadingRoute && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-extrabold text-[#2D6A4F]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Calculating optimal path...</span>
              </div>
            )}
          </div>

          {/* Route Metrics Summary Card */}
          {route && (
            <div className="p-4 rounded-2xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Estimated Travel</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-[#2D6A4F]">{route.summary.durationFormatted}</span>
                  <span className="text-xs font-extrabold text-gray-600">({route.summary.distanceKm} km)</span>
                </div>
              </div>

              {route.summary.hasCrowdDiversion && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#2D6A4F] text-white text-[10px] font-black shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Tranquil Route Active</span>
                </div>
              )}
            </div>
          )}

          {locError && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{locError}</span>
            </div>
          )}

          {/* Turn-by-Turn Maneuvers List */}
          {route && route.maneuvers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">Maneuver Directions:</h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {route.maneuvers.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-[#E3DFD5] text-xs flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-stone-100 text-[#582F0E] font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#582F0E]">{step.instruction}</p>
                      {step.streetName && <p className="text-[10px] text-gray-500">{step.streetName}</p>}
                    </div>
                    <span className="text-[10px] font-extrabold text-stone-500 whitespace-nowrap">
                      {step.distanceMeters >= 1000
                        ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                        : `${step.distanceMeters} m`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-[#E3DFD5] flex items-center justify-between gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-gray-500 hover:text-gray-800 inline-flex items-center gap-1.5 transition"
          >
            <span>External Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black transition cursor-pointer active:scale-95"
          >
            Close Navigation
          </button>
        </div>
      </div>
    </div>
  );
}
