'use client';

import React from 'react';
import { Camera, MapPin, ShieldCheck } from 'lucide-react';
import { PhotoCfg } from '../types';
import { MiniMapPreview } from '@/components/MiniMapPreview';

interface PhotoPanelProps {
  config: PhotoCfg;
  destinationCoords: { lat: number; lng: number };
  onChange: (updated: PhotoCfg) => void;
}

export function PhotoPanel({ config, destinationCoords, onChange }: PhotoPanelProps) {
  const { prompt, fence, require_gps } = config;

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      ...config,
      prompt: e.target.value,
    });
  };

  const handleToggleFence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    onChange({
      ...config,
      require_gps: enabled,
      fence: enabled
        ? fence || {
            lat: destinationCoords.lat,
            lng: destinationCoords.lng,
            radius_meters: 100,
          }
        : null,
    });
  };

  const handleLocationChange = (lat: number, lng: number) => {
    if (!fence) return;
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
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-amber-700" />
          Photo Prompt Instructions
        </label>
        <textarea
          rows={2}
          value={prompt}
          onChange={handlePromptChange}
          placeholder="e.g., Take a photo of the heritage marker plaque or the main viewpoint pavilion."
          className="w-full p-3 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <p className="text-[10px] text-stone-400">
          Be specific about what landmark, plaque, or angle travelers should capture.
        </p>
      </div>

      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
          <input
            type="checkbox"
            checked={require_gps}
            onChange={handleToggleFence}
            className="w-4 h-4 rounded text-amber-600 accent-amber-700 cursor-pointer"
          />
          <span>Must be taken on-site (GPS Fence Enforcement)</span>
        </label>
        <p className="text-[11px] text-amber-900/80 leading-relaxed">
          When checked, traveler uploads require valid camera GPS metadata within the perimeter. All submitted photos are moderated by administrators before reward settlement.
        </p>
      </div>

      {require_gps && fence && (
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-700" />
            Photo Capture Area Pin
          </label>
          <MiniMapPreview
            lat={fence.lat}
            lng={fence.lng}
            zoom={15}
            height="h-44"
            interactive={true}
            onLocationChange={handleLocationChange}
            badgeLabel="Photo geofence target"
          />
        </div>
      )}
    </div>
  );
}
