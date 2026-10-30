'use client';

import React from 'react';
import { Box, Gem, Sparkles, Smartphone, RotateCcw } from 'lucide-react';
import { ArCfg } from '../types';
import { MiniMapPreview } from '@/components/MiniMapPreview';

interface ArPanelProps {
  config: ArCfg;
  destinationCoords: { lat: number; lng: number };
  onChange: (updated: ArCfg) => void;
}

const AR_OBJECTS: { id: ArCfg['object']; label: string; icon: string }[] = [
  { id: 'token', label: 'Gold Token', icon: '🪙' },
  { id: 'gem', label: 'Emerald Gem', icon: '💎' },
  { id: 'beacon', label: 'Signal Beacon', icon: '🏮' },
  { id: 'box', label: 'Treasure Box', icon: '📦' },
];

const AR_COLORS: { hex: ArCfg['color']; name: string; bgClass: string }[] = [
  { hex: '#FFB703', name: 'Gold', bgClass: 'bg-[#FFB703]' },
  { hex: '#2D6A4F', name: 'Emerald', bgClass: 'bg-[#2D6A4F]' },
  { hex: '#3B82F6', name: 'Azure', bgClass: 'bg-[#3B82F6]' },
  { hex: '#E11D48', name: 'Ruby', bgClass: 'bg-[#E11D48]' },
];

export function ArPanel({ config, destinationCoords, onChange }: ArPanelProps) {
  const { fence, object, color } = config;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const radius = Number(e.target.value);
    onChange({
      ...config,
      fence: { ...fence, radius_meters: radius },
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
    <div className="space-y-4 pt-2">
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 leading-relaxed">
        <Smartphone className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <strong>Mobile-Exclusive AR Experience:</strong> Travelers use their smartphone camera in the JuanDerQuest Android app to find and collect the 3D model on-site.
        </div>
      </div>

      {/* 3D Model Picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700">3D Virtual Object</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AR_OBJECTS.map((obj) => {
            const isSelected = object === obj.id;
            return (
              <button
                key={obj.id}
                type="button"
                onClick={() => onChange({ ...config, object: obj.id })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                    : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                }`}
              >
                <span className="text-xl">{obj.icon}</span>
                <span>{obj.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Swatch Picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700">Illumination Hue</label>
        <div className="flex items-center gap-3">
          {AR_COLORS.map((col) => {
            const isSelected = color === col.hex;
            return (
              <button
                key={col.hex}
                type="button"
                onClick={() => onChange({ ...config, color: col.hex })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full ${col.bgClass}`} />
                <span>{col.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AR Viewfinder Perimeter Fence */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            AR Viewfinder Activation Radius
          </label>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                fence: {
                  lat: destinationCoords.lat,
                  lng: destinationCoords.lng,
                  radius_meters: 50,
                },
              })
            }
            className="text-[11px] font-bold text-purple-800 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset to center
          </button>
        </div>

        <MiniMapPreview
          satelliteToggle
          lat={fence.lat}
          lng={fence.lng}
          zoom={16}
          height="h-44"
          interactive={true}
          onLocationChange={handleLocationChange}
          badgeLabel="AR object placement pin"
        />

        <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-600">Proximity Perimeter</span>
            <span className="font-extrabold text-purple-800">{fence.radius_meters} meters</span>
          </div>
          <input
            type="range"
            min={30}
            max={150}
            step={5}
            value={fence.radius_meters}
            onChange={handleSliderChange}
            className="w-full accent-purple-700 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-stone-400 font-medium">
            <span>30 m</span>
            <span>50 m (ideal)</span>
            <span>150 m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
