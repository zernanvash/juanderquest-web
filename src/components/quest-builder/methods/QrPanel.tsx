'use client';

import React from 'react';
import { QrCode, RotateCcw, ScanLine, UserCheck } from 'lucide-react';
import { QrCfg, QrScanMode } from '../types';
import { MiniMapPreview } from '@/components/MiniMapPreview';

interface QrPanelProps {
  config: QrCfg;
  destinationCoords: { lat: number; lng: number };
  onChange: (updated: QrCfg) => void;
}

export function QrPanel({ config, destinationCoords, onChange }: QrPanelProps) {
  const { fence } = config;
  const scanMode: QrScanMode = config.scan_mode ?? 'traveler_scans';
  const hostScans = scanMode === 'host_scans_traveler';

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
        radius_meters: 80,
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

  const modes: Array<{ value: QrScanMode; label: string; hint: string; Icon: typeof ScanLine }> = [
    { value: 'traveler_scans', label: 'Traveler scans a code', hint: 'You print a QR placard; the traveler scans it on site.', Icon: ScanLine },
    { value: 'host_scans_traveler', label: 'I scan the traveler', hint: 'The traveler shows a quest pass in the app; you scan it on site.', Icon: UserCheck },
  ];

  return (
    <div className="space-y-3 pt-2">
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-bold text-stone-700 mb-1">Who scans?</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {modes.map(({ value, label, hint, Icon }) => {
            const active = scanMode === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...config, scan_mode: value })}
                className={`text-left rounded-xl border p-2.5 transition cursor-pointer ${active ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
              >
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-stone-800"><Icon className="w-3.5 h-3.5 text-blue-700" /> {label}</span>
                <span className="block mt-0.5 text-[11px] text-stone-500 leading-snug">{hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-blue-700" />
          {hostScans ? 'Where you scan travelers' : 'On-site QR Verification Fence'}
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
        lat={fence.lat}
        lng={fence.lng}
        zoom={15}
        height="h-44"
        interactive={true}
        onLocationChange={handleLocationChange}
        badgeLabel={hostScans ? 'Host check-in location (drag to position)' : 'QR placard location (drag to position)'}
      />

      <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-600">Scan Radius</span>
          <span className="font-extrabold text-blue-800">{fence.radius_meters} meters</span>
        </div>
        <input
          type="range"
          min={30}
          max={300}
          step={10}
          value={fence.radius_meters}
          onChange={handleSliderChange}
          className="w-full accent-blue-700 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-stone-400 font-medium">
          <span>30 m</span>
          <span>80 m (recommended)</span>
          <span>300 m</span>
        </div>
      </div>

      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
        {hostScans ? (
          <><strong>Host scan:</strong> each traveler gets a personal quest pass in the app (valid 10 minutes, one use). Open the quest in the app and use <em>Scan traveler pass</em> while you are inside this area. Nothing needs printing.</>
        ) : (
          <><strong>Secret QR Code:</strong> A cryptographically secure, unpredictable code is assigned by the server upon saving. You can print the ready-to-display QR placard sheet from the <em>QR Sheet</em> tab anytime.</>
        )}
      </div>
    </div>
  );
}
