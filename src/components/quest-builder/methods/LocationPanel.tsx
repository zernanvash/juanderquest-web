'use client';

import React from 'react';
import { MapPin, RotateCcw } from 'lucide-react';
import { LocationCfg, GeoFence } from '../types';
import { MiniMapPreview } from '@/components/MiniMapPreview';

interface LocationPanelProps {
  config: LocationCfg;
  destinationCoords: { lat: number; lng: number };
  onChange: (updated: LocationCfg) => void;
}

export function LocationPanel({ config, destinationCoords, onChange }: LocationPanelProps) {
  const { fence } = config;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const radius = Number(e.target.value);
    onChange({
      ...config,
      fence: { ...fence, radius_meters: radius },
    });
  };

  const handleResetToDestination = () => {
    onChange({
      ...config,
      fence: {
        lat: destinationCoords.lat,
        lng: destinationCoords.lng,
        radius_meters: 100,
      },
    });
  };

  const handleLocationChange = (lat: number, lng: number) => {
    onChange({
      ...config,
      fence: {
        ...fence,
        lat,
        lng,
      },
    });
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
          Location Check-in Fence
        </label>
        <button
          type="button"
          onClick={handleResetToDestination}
          className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" /> Use destination coordinates
        </button>
      </div>

      <MiniMapPreview
        satelliteToggle
        lat={fence.lat}
        lng={fence.lng}
        zoom={15}
        height="h-44"
        interactive={true}
        onLocationChange={handleLocationChange}
        badgeLabel="Check-in target pin (drag to relocate)"
      />

      <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-600">Geofence Radius</span>
          <span className="font-extrabold text-[#2D6A4F]">{fence.radius_meters} meters</span>
        </div>
        <input
          type="range"
          min={30}
          max={500}
          step={10}
          value={fence.radius_meters}
          onChange={handleSliderChange}
          className="w-full accent-emerald-700 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-stone-400 font-medium">
          <span>30 m</span>
          <span>100 m (recommended)</span>
          <span>500 m</span>
        </div>
      </div>
    </div>
  );
}
