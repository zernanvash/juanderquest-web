'use client';
import React from 'react';
import { createPortal } from 'react-dom';
import { Compass, Pause, Play, X } from 'lucide-react';
import { ProfileBanner } from './ProfileBanner';
import { CosmeticAvatar } from './CosmeticAvatar';
import { DisplayName } from './DisplayName';

// Plan 69: the shop preview looks like the traveler's real profile header. The item being
// previewed takes its slot; the traveler's other equipped cosmetics stay on.
export type PreviewKind = 'banner' | 'frame' | 'title' | 'name_color';
export type PreviewItem = { id: string; kind: PreviewKind; name: string; asset: any; seed?: number };
export type Loadout = Partial<Record<PreviewKind, PreviewItem | null>>;

const SLOT_LABEL: Record<PreviewKind, string> = { banner: 'Banner', frame: 'Frame', title: 'Title', name_color: 'Name colour' };

export const composeLoadout = (equipped: Loadout, selected: PreviewItem): Loadout => ({ ...equipped, [selected.kind]: selected });

export function PassportPreview({
  selected,
  equipped,
  traveler,
  rarity,
  description,
  onClose,
  children,
}: {
  selected: PreviewItem;
  equipped: Loadout;
  traveler: { displayName: string; avatarUrl?: string | null; handle?: string | null } | null;
  rarity?: string;
  description?: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const [animated, setAnimated] = React.useState(true);
  const loadout = composeLoadout(equipped, selected);
  const name = traveler?.displayName || 'Traveler';
  const banner = loadout.banner;
  const procedural = banner?.asset?.style === 'procedural';
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portal to <body>: the page wrapper animates with a transform, which would trap a fixed dialog.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="passport-preview-title"
        className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-800">✨ Live passport preview</p>
          <div className="flex items-center gap-1.5">
            {(selected.kind === 'banner' || banner) && (
              <button type="button" onClick={() => setAnimated((on) => !on)} aria-pressed={animated}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50">
                {animated ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
                {animated ? 'Animated' : 'Still'}
              </button>
            )}
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close preview" className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Profile header, as on /profile */}
        <div className="mx-3 overflow-hidden rounded-2xl border border-[#E3DFD5] sm:mx-5">
          <ProfileBanner asset={banner?.asset} seed={banner?.seed} motion={animated ? 'live' : 'still'} scrim="subtle" aspect={3}
            className="h-44 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] sm:h-52">
            <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
              <Compass className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" /> Your Passport
            </span>
            {procedural && typeof banner?.seed === 'number' && (
              <span className="absolute bottom-2 right-3 rounded-full bg-black/35 px-2 py-0.5 font-mono text-[10px] text-white/90">
                seed #{(banner.seed >>> 0).toString(16).padStart(8, '0')}
              </span>
            )}
          </ProfileBanner>
          <div className="px-4 pb-4 sm:px-6">
            <div className="-mt-12 flex items-end gap-3 sm:-mt-14 sm:gap-4">
              <div className="relative flex w-fit rounded-full border-4 border-white bg-white shadow-lg">
                <CosmeticAvatar src={traveler?.avatarUrl} name={name} frame={loadout.frame ?? undefined} size="xl" />
              </div>
            </div>
            <h2 id="passport-preview-title" className="mt-2 text-xl font-black text-[#2C221E] sm:text-2xl">
              <DisplayName name={name} title={loadout.title ?? undefined} nameColor={loadout.name_color ?? undefined} />
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-600">
              {traveler?.handle && <span className="font-bold text-emerald-800">@{traveler.handle}</span>}
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">Traveler</span>
              <span>Pangasinan</span>
            </p>
          </div>
        </div>

        {/* What is being previewed, with the rest of the loadout */}
        <ul aria-label="Preview loadout" className="mx-3 mt-3 flex flex-wrap gap-1.5 sm:mx-5">
          {(Object.keys(SLOT_LABEL) as PreviewKind[]).map((kind) => {
            const item = loadout[kind];
            if (!item) return null;
            const previewing = kind === selected.kind;
            return (
              <li key={kind} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${previewing ? 'bg-amber-300 text-amber-950' : 'bg-stone-100 text-stone-700'}`}>
                {previewing ? 'Previewing' : 'Equipped'} {SLOT_LABEL[kind]}: {item.name}
              </li>
            );
          })}
        </ul>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-[#582f0e]">{selected.name}</h3>
            {rarity && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-900">{rarity}</span>}
            {procedural && selected.kind === 'banner' && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black uppercase text-sky-900">Procedural · animated</span>}
          </div>
          {description && <p className="text-sm text-stone-600">{description}</p>}
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default PassportPreview;
