'use client';

import React, { useState, useEffect } from 'react';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import {
  readPreferences,
  savePreference,
} from '@/lib/settings-preferences';
import {
  MapPin,
  Volume2,
  VolumeX,
  Compass,
} from 'lucide-react';

export default function MapAudioSettingsPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highContrastMap, setHighContrastMap] = useState(false);

  useEffect(() => {
    const prefs = readPreferences();
    setSoundEnabled(prefs.soundEnabled);
    setHighContrastMap(prefs.highContrastMap);
  }, []);

  const handleToggleSound = (val: boolean) => {
    setSoundEnabled(val);
    savePreference('soundEnabled', val);
  };

  const handleToggleMap = (val: boolean) => {
    setHighContrastMap(val);
    savePreference('highContrastMap', val);
  };

  return (
    <SettingsSubpage
      title="Map & Audio Experience"
      description="Configure your navigation raster layer and auditory feedback."
    >
      <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border-default)]">
          <MapPin className="w-5 h-5 text-[var(--color-brand-primary)]" />
          <div>
            <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
              Map &amp; Audio Experience
            </h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Configure your navigation raster layer and auditory feedback.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <VolumeX className="w-4 h-4 text-stone-400 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                  Audio Check-in Feedback
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Play gentle audio chime upon successful GPS proof verification.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => handleToggleSound(e.target.checked)}
              className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                  High-Contrast Map Routing
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Enhance waypoint visibility on OpenStreetMap raster tiles.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={highContrastMap}
              onChange={(e) => handleToggleMap(e.target.checked)}
              className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
            />
          </label>
        </div>
      </section>
    </SettingsSubpage>
  );
}
