'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Route,
  MapPin,
  Compass,
  Navigation as NavIcon,
  Clock3,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Car,
  Bike,
  Footprints,
  Info,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { planTrailRoute, fetchTrailServiceArea, TrailPlanModel, TrailCandidateStop, TrailServiceArea } from '@/lib/api';

interface LocationPreset {
  label: string;
  municipality: string;
  lat: number;
  lng: number;
}

const ORIGIN_PRESETS: LocationPreset[] = [
  { label: 'Dagupan City Plaza', municipality: 'Dagupan City', lat: 16.0433, lng: 120.3333 },
  { label: 'Lingayen Provincial Capitol', municipality: 'Lingayen', lat: 16.0218, lng: 120.2319 },
  { label: 'Alaminos Lucap Wharf', municipality: 'Alaminos City', lat: 16.155, lng: 119.98 },
  { label: 'Manaoag Minor Basilica', municipality: 'Manaoag', lat: 16.0436, lng: 120.4854 },
  { label: 'Urdaneta City Center', municipality: 'Urdaneta City', lat: 15.9758, lng: 120.571 },
];

const DESTINATION_PRESETS: LocationPreset[] = [
  { label: 'Hundred Islands National Park', municipality: 'Alaminos City', lat: 16.2063, lng: 119.9706 },
  { label: 'Patar White Beach', municipality: 'Bolinao', lat: 16.3204, lng: 119.7847 },
  { label: 'Bolinao Falls 1', municipality: 'Bolinao', lat: 16.3377, lng: 119.8806 },
  { label: 'Minor Basilica of Manaoag', municipality: 'Manaoag', lat: 16.0436, lng: 120.4854 },
  { label: 'Cape Bolinao Lighthouse', municipality: 'Bolinao', lat: 16.3072, lng: 119.7886 },
];

export function TrailClient() {
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(0);
  const [costing, setCosting] = useState<'auto' | 'motorcycle' | 'bicycle' | 'pedestrian'>('auto');
  const [maxDetourKm, setMaxDetourKm] = useState(15);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [avoidCongested, setAvoidCongested] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [planResult, setPlanResult] = useState<TrailPlanModel | null>(null);
  const [serviceArea, setServiceArea] = useState<TrailServiceArea | null>(null);
  const [selectedStops, setSelectedStops] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchTrailServiceArea()
      .then((data) => setServiceArea(data))
      .catch(() => {
        // non-fatal if offline/fallback
      });
  }, []);

  const handleToggleCategory = (cat: string) => {
    setCategoryFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setErrorMessage('');

    const start = ORIGIN_PRESETS[startIdx];
    const end = DESTINATION_PRESETS[endIdx];

    try {
      const plan = await planTrailRoute({
        start: { lat: start.lat, lng: start.lng, name: start.label },
        end: { lat: end.lat, lng: end.lng, name: end.label },
        costing,
        max_stops: 4,
        max_detour_km: maxDetourKm,
        preferred_categories: categoryFilters.length > 0 ? categoryFilters : undefined,
        avoid_congested: avoidCongested,
      });

      setPlanResult(plan);
      const initialSelected: Record<string, boolean> = {};
      plan.suggested_stops.forEach((s) => {
        initialSelected[s.spot_id] = true;
      });
      setSelectedStops(initialSelected);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || err.message || 'Failed to calculate trail route.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStopSelection = (spotId: string) => {
    setSelectedStops((prev) => ({
      ...prev,
      [spotId]: !prev[spotId],
    }));
  };

  return (
    <Navigation>
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Header Section */}
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border-default)] bg-white p-6 sm:p-10 shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
          />
          <div className="relative max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#2D6A4F] shadow-xs">
                <Route aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-[#2D6A4F]">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[#FFB703]" />
                Pilot Preview • Deterministic Corridor Engine
              </span>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2D6A4F]">
              Sovereign Route &amp; Stop Planner
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#582F0E]">
              The Trail
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-[#514532]">
              Choose a departure point and destination to compute sovereign routing across Pangasinan. The Trail
              identifies worthwhile cultural, eco-tourism, and food stops along your travel corridor using explainable
              detour geometry and crowd telemetry.
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs text-amber-900">
              <Info className="w-4 h-4 shrink-0 text-amber-700" />
              <span>
                <strong>Truthful data guarantee:</strong> All stop suggestions cite verified open-catalog coordinates and
                valhalla OSM graph math. We never fabricate opening hours, AI synthetic venues, or merchant inventory.
              </span>
            </div>
          </div>
        </section>

        {/* Route Planning Controls */}
        <section
          aria-labelledby="trail-planner-title"
          className="rounded-3xl border border-[var(--color-border-default)] bg-white p-6 sm:p-8 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-black/5">
            <div>
              <h2 id="trail-planner-title" className="text-xl font-black text-[#582F0E]">
                Configure Your Journey
              </h2>
              <p className="text-xs text-[#837560]">
                Select origin, destination, and corridor detour budget.
              </p>
            </div>
            <Sliders className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Origin Selection */}
            <div className="space-y-2">
              <label htmlFor="origin-select" className="text-xs font-bold text-[#582F0E] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Starting Point (Origin)</span>
              </label>
              <select
                id="origin-select"
                value={startIdx}
                onChange={(e) => setStartIdx(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-[#FAF9F5] p-3 text-sm font-semibold text-[#582F0E] focus:outline-emerald-600"
              >
                {ORIGIN_PRESETS.map((preset, idx) => (
                  <option key={preset.label} value={idx}>
                    {preset.label} ({preset.municipality})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Selection */}
            <div className="space-y-2">
              <label htmlFor="destination-select" className="text-xs font-bold text-[#582F0E] flex items-center gap-1.5">
                <NavIcon className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Final Destination</span>
              </label>
              <select
                id="destination-select"
                value={endIdx}
                onChange={(e) => setEndIdx(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-[#FAF9F5] p-3 text-sm font-semibold text-[#582F0E] focus:outline-emerald-600"
              >
                {DESTINATION_PRESETS.map((preset, idx) => (
                  <option key={preset.label} value={idx}>
                    {preset.label} ({preset.municipality})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Travel Mode & Detour Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#582F0E] block">Travel Mode</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'auto', label: 'Car', icon: Car },
                  { id: 'motorcycle', label: 'Moto', icon: Compass },
                  { id: 'bicycle', label: 'Bike', icon: Bike },
                  { id: 'pedestrian', label: 'Walk', icon: Footprints },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const active = costing === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setCosting(mode.id as any)}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 text-[#2D6A4F]'
                          : 'border-[var(--color-border-default)] bg-[#FAF9F5] text-[#582F0E] hover:bg-stone-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="detour-range" className="text-xs font-bold text-[#582F0E]">
                  Max Detour Budget: <span className="text-[#2D6A4F] font-mono">{maxDetourKm} km</span>
                </label>
                <span className="text-[10px] text-gray-400">Extra distance limit</span>
              </div>
              <input
                id="detour-range"
                type="range"
                min="3"
                max="30"
                step="1"
                value={maxDetourKm}
                onChange={(e) => setMaxDetourKm(Number(e.target.value))}
                className="w-full accent-[#2D6A4F] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                <span>3 km (Direct Corridor)</span>
                <span>15 km (Balanced)</span>
                <span>30 km (Scenic Explorer)</span>
              </div>
            </div>
          </div>

          {/* Category Preferences */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-[#582F0E] block">Interested Categories (Optional Boost)</span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'culture_heritage', label: 'Culture & Heritage' },
                { id: 'nature_outdoors', label: 'Nature & Outdoors' },
                { id: 'eat_drink', label: 'Local Food & Dining' },
                { id: 'activities_wellness', label: 'Activities & Recreation' },
              ].map((cat) => {
                const active = categoryFilters.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                      active
                        ? 'border-emerald-600 bg-emerald-100/70 text-[#2D6A4F]'
                        : 'border-[var(--color-border-default)] bg-[#FAF9F5] text-[#582F0E] hover:bg-stone-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-6 py-3 text-sm font-bold text-white shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Corridor &amp; Stops...</span>
                </>
              ) : (
                <>
                  <Route className="w-4 h-4" />
                  <span>Plan Corridor Trail</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Results Presentation */}
        {planResult && (
          <section aria-label="Trail Plan Results" className="space-y-6">
            {/* Route Baseline Summary */}
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-black/5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                    Computed Corridor Baseline
                  </span>
                  <h3 className="text-xl font-black text-[#582F0E]">
                    {ORIGIN_PRESETS[startIdx].label} → {DESTINATION_PRESETS[endIdx].label}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#2D6A4F] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    {planResult.baseline_route.summary.distanceKm} km • {planResult.baseline_route.summary.durationFormatted}
                  </span>
                </div>
              </div>

              {planResult.baseline_route.degraded && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <div>
                    <strong>Degraded Straight-Line Fallback:</strong> Valhalla daemon is currently offline or unreachable.
                    Distances shown are direct geometric approximations; turn-by-turn guidance is temporarily disabled.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#514532]">
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-black/5">
                  <span className="text-gray-400 block text-[10px] font-bold">Road Engine</span>
                  <span className="font-bold text-[#582F0E] uppercase">{planResult.baseline_route.summary.engine}</span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-black/5">
                  <span className="text-gray-400 block text-[10px] font-bold">Crowd Diversion</span>
                  <span className="font-bold text-[#582F0E]">
                    {planResult.baseline_route.summary.hasCrowdDiversion ? 'Active Divert' : 'Normal Flow'}
                  </span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-black/5">
                  <span className="text-gray-400 block text-[10px] font-bold">Waypoints</span>
                  <span className="font-bold text-[#582F0E]">{planResult.baseline_route.coordinates.length} points</span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-black/5">
                  <span className="text-gray-400 block text-[10px] font-bold">Candidates Evaluated</span>
                  <span className="font-bold text-[#582F0E]">{planResult.total_candidates_evaluated} spots</span>
                </div>
              </div>
            </div>

            {/* Suggested Stops along Corridor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#582F0E]">
                    Recommended Stops Along Corridor
                  </h3>
                  <p className="text-xs text-[#837560]">
                    Ranked deterministically by detour efficiency and crowd status. Check/uncheck stops to customize your itinerary.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-gray-500">
                  {Object.values(selectedStops).filter(Boolean).length} / {planResult.suggested_stops.length} Selected
                </span>
              </div>

              {planResult.suggested_stops.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-[var(--color-border-default)] space-y-2">
                  <p className="font-bold text-sm text-[#582F0E]">No candidate stops within your detour budget.</p>
                  <p className="text-xs text-[#837560]">Try increasing your max detour budget slider above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {planResult.suggested_stops.map((stop) => {
                    const isSelected = selectedStops[stop.spot_id] ?? true;
                    return (
                      <article
                        key={stop.spot_id}
                        onClick={() => toggleStopSelection(stop.spot_id)}
                        className={`p-5 rounded-2xl border transition cursor-pointer space-y-3 ${
                          isSelected
                            ? 'bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-400/30'
                            : 'bg-stone-50/70 border-[var(--color-border-default)] opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  stop.recommendation_label === 'Curated'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : 'bg-blue-100 text-blue-900'
                                }`}
                              >
                                {stop.recommendation_label}
                              </span>
                              <span className="text-[11px] font-mono text-gray-500">
                                +{stop.detour_km} km detour
                              </span>
                            </div>
                            <h4 className="font-extrabold text-base text-[#582F0E]">
                              {stop.name}
                            </h4>
                            {stop.municipality && (
                              <p className="text-xs text-[#837560] flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span>{stop.municipality}</span>
                              </p>
                            )}
                          </div>
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                              isSelected
                                ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Reason Codes Badges */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {stop.reason_codes.map((code) => (
                            <span
                              key={code}
                              className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-bold text-gray-600"
                            >
                              {code.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs text-gray-500">
                          <span>{stop.distance_from_start_km.toFixed(1)} km from start</span>
                          <span
                            className={`font-semibold ${
                              stop.crowd_status === 'quiet'
                                ? 'text-emerald-700'
                                : stop.crowd_status === 'estimated_busy'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }`}
                          >
                            Crowd: {stop.crowd_status}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Service Area & Disclaimer */}
            <div className="rounded-2xl border border-[var(--color-border-default)] bg-[#FAF9F5] p-5 text-xs text-[#514532] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#582F0E]">
                <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                <span>Service Area: {planResult.service_area.name}</span>
              </div>
              <p className="leading-relaxed text-gray-600">{planResult.disclaimer}</p>
              <p className="text-[11px] text-gray-400 font-mono pt-1">
                Routing Graph: {planResult.service_area.license}
              </p>
            </div>
          </section>
        )}
      </div>
    </Navigation>
  );
}
