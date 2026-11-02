'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ProfileBanner } from '@/components/cosmetics/ProfileBanner';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { DisplayName } from '@/components/cosmetics/DisplayName';

export function AppearanceSection({
  name,
  avatar,
}: {
  name: string;
  avatar: string;
}) {
  const [items, setItems] = useState<
    Array<{ id: string; kind: string; name: string; asset: unknown; seed?: number }>
  >([]);
  const [value, setValue] = useState<Record<string, string | null>>({
    banner_id: null,
    frame_id: null,
    title_id: null,
    name_color_id: null,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    let live = true;
    Promise.all([api.get('/shop/cosmetics'), api.get('/me/cosmetics')])
      .then(([catalog, me]) => {
        if (!live) return;
        setItems(catalog.data?.data || []);
        setValue(me.data?.data?.loadout || {});
      })
      .catch(() => setMessage('Appearance items could not be loaded.'));
    return () => {
      live = false;
    };
  }, []);

  const slots = [
    ['banner_id', 'banner', 'Banner'],
    ['frame_id', 'frame', 'Avatar frame'],
    ['title_id', 'title', 'Title'],
    ['name_color_id', 'name_color', 'Name colour'],
  ] as const;

  const save = async () => {
    try {
      await api.put('/me/cosmetics/loadout', value);
      setMessage('Appearance saved.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setMessage(
        err.response?.data?.error?.message || 'Appearance could not be saved.'
      );
    }
  };

  const banner = items.find((i) => i.id === value.banner_id);
  const frame = items.find((i) => i.id === value.frame_id);
  const title = items.find((i) => i.id === value.title_id);
  const color = items.find((i) => i.id === value.name_color_id);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-xs">
      <div className="p-5 sm:p-6">
        <h2 className="text-base font-black text-[var(--color-brand-brown)]">
          Appearance
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Preview and equip cosmetics you own.
        </p>
        {/* Plan 69: same layout as the profile header; this is a preview, so it animates. */}
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <ProfileBanner
            asset={banner?.asset as any}
            seed={banner?.seed}
            motion="live"
            scrim="subtle"
            className="h-32 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] sm:h-40"
          />
          <div className="px-4 pb-4">
            <div className="relative -mt-10 flex w-fit rounded-full border-4 border-white bg-white shadow-md">
              <CosmeticAvatar
                src={avatar}
                name={name}
                frame={frame as any}
                size="lg"
              />
            </div>
            <p className="mt-1 text-lg font-black text-[#2C221E]">
              <DisplayName name={name} title={title as any} nameColor={color as any} />
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {slots.map(([key, kind, label]) => (
            <label key={key} className="text-xs font-bold text-stone-700">
              {label}
              <select
                value={value[key] || ''}
                onChange={(e) =>
                  setValue((v) => ({ ...v, [key]: e.target.value || null }))
                }
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2"
              >
                <option value="">None</option>
                {items
                  .filter((i) => i.kind === kind && (i as { owned?: boolean }).owned)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => void save()}
            className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white"
          >
            Save appearance
          </button>
          <span role="status" className="text-xs text-stone-600">
            {message}
          </span>
        </div>
      </div>
    </section>
  );
}
