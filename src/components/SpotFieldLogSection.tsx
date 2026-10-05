'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Compass, 
  Lightbulb, 
  Backpack, 
  Waves, 
  UtensilsCrossed, 
  Landmark, 
  Leaf, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { triggerCelebration } from './CelebrationEffects';

export type FieldLogTag = 
  | 'local_tip' 
  | 'gear_alert' 
  | 'tide_condition' 
  | 'food_find' 
  | 'heritage' 
  | 'eco_watch' 
  | 'general';

export interface SpotFieldLogItem {
  id: string;
  spot_id: string;
  user_id: string;
  author_name: string;
  author_badge: string;
  tag: FieldLogTag;
  content: string;
  helpful_count: number;
  helpful_user_ids: string[];
  created_at: string;
  is_verified_visit?: boolean;
}

interface TagConfig {
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const TAG_CONFIG: Record<FieldLogTag, TagConfig> = {
  local_tip: {
    label: 'Local Secret & Tip',
    shortLabel: '💡 Tips',
    icon: Lightbulb,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-[#B45309]',
    badgeBorder: 'border-amber-200',
  },
  gear_alert: {
    label: 'Gear & Pack Alert',
    shortLabel: '🎒 Gear',
    icon: Backpack,
    badgeBg: 'bg-blue-50',
    badgeText: 'text-[#1D4ED8]',
    badgeBorder: 'border-blue-200',
  },
  tide_condition: {
    label: 'Tide & Trail Condition',
    shortLabel: '🌊 Conditions',
    icon: Waves,
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-[#0E7490]',
    badgeBorder: 'border-cyan-200',
  },
  food_find: {
    label: 'Pasalubong & Food Find',
    shortLabel: '🍱 Food',
    icon: UtensilsCrossed,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-[#15803D]',
    badgeBorder: 'border-emerald-200',
  },
  heritage: {
    label: 'Heritage & History',
    shortLabel: '🏛️ Heritage',
    icon: Landmark,
    badgeBg: 'bg-stone-100',
    badgeText: 'text-[#582F0E]',
    badgeBorder: 'border-stone-300',
  },
  eco_watch: {
    label: 'Eco Watch & Respect',
    shortLabel: '🌿 Eco',
    icon: Leaf,
    badgeBg: 'bg-teal-50',
    badgeText: 'text-[#0F766E]',
    badgeBorder: 'border-teal-200',
  },
  general: {
    label: 'Explorer Impression',
    shortLabel: '🧭 General',
    icon: Compass,
    badgeBg: 'bg-stone-50',
    badgeText: 'text-stone-700',
    badgeBorder: 'border-stone-200',
  },
};

export interface SpotFieldLogSectionProps {
  spotId: string;
  spotName: string;
  onLogsCountChange?: (count: number) => void;
}

export function SpotFieldLogSection({
  spotId,
  spotName,
  onLogsCountChange,
}: SpotFieldLogSectionProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SpotFieldLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Composer state
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<FieldLogTag>('local_tip');
  const [authorNameInput, setAuthorNameInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState<Record<string, boolean>>({});

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get(`/spots/${spotId}/comments`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setLogs(res.data.data);
        if (onLogsCountChange) onLogsCountChange(res.data.data.length);
        return;
      }
    } catch {
      // Fall back to localStorage if backend is unreachable
      try {
        const stored = localStorage.getItem(`jdq_field_logs_${spotId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setLogs(parsed);
          if (onLogsCountChange) onLogsCountChange(parsed.length);
          return;
        }
      } catch {
        // Ignore parse error
      }
    } finally {
      setLoading(false);
    }
  }, [spotId, onLogsCountChange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleToggleHelpful = async (logId: string) => {
    // Optimistic toggle
    const isCurrentlyHelpful = helpfulVoted[logId];
    setHelpfulVoted((prev) => ({ ...prev, [logId]: !isCurrentlyHelpful }));

    setLogs((prev) =>
      prev.map((item) => {
        if (item.id === logId) {
          const count = isCurrentlyHelpful
            ? Math.max(0, item.helpful_count - 1)
            : item.helpful_count + 1;
          return { ...item, helpful_count: count };
        }
        return item;
      })
    );

    try {
      await api.post(`/spots/${spotId}/comments/${logId}/helpful`);
    } catch {
      // Keep optimistic state
    }
  };

  const handlePostDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    const authorName = user?.displayName || authorNameInput.trim() || 'Pangasinan Scout';

    try {
      const res = await api.post(`/spots/${spotId}/comments`, {
        content: content.trim(),
        tag: selectedTag,
        author_name: authorName,
      });

      if (res.data?.success && res.data.data) {
        const newLog = res.data.data;
        const updated = [newLog, ...logs];
        setLogs(updated);
        if (onLogsCountChange) onLogsCountChange(updated.length);

        // Save to local storage cache
        try {
          localStorage.setItem(`jdq_field_logs_${spotId}`, JSON.stringify(updated));
        } catch {}

        setContent('');
        setComposerOpen(false);
        triggerCelebration({ type: 'poppers', playAudio: true });
      }
    } catch {
      // Optimistic local storage creation if offline
      const mockLog: SpotFieldLogItem = {
        id: `local-${Date.now()}`,
        spot_id: spotId,
        user_id: user?.id || 'guest',
        author_name: authorName,
        author_badge: user ? 'Verified Scout' : 'Explorer',
        tag: selectedTag,
        content: content.trim(),
        helpful_count: 0,
        helpful_user_ids: [],
        created_at: new Date().toISOString(),
        is_verified_visit: false,
      };

      const updated = [mockLog, ...logs];
      setLogs(updated);
      if (onLogsCountChange) onLogsCountChange(updated.length);
      try {
        localStorage.setItem(`jdq_field_logs_${spotId}`, JSON.stringify(updated));
      } catch {}

      setContent('');
      setComposerOpen(false);
      triggerCelebration({ type: 'poppers', playAudio: true });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (activeFilter === 'all') return true;
    return l.tag === activeFilter;
  });

  const filterOptions = [
    { id: 'all', label: `All (${logs.length})` },
    { id: 'local_tip', label: '💡 Tips' },
    { id: 'gear_alert', label: '🎒 Gear' },
    { id: 'tide_condition', label: '🌊 Tide & Trail' },
    { id: 'food_find', label: '🍱 Food' },
    { id: 'eco_watch', label: '🌿 Eco' },
  ];

  return (
    <div className="bg-[#FAF9F5] border-t border-[#E3DFD5] p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-[#582F0E] flex items-center gap-1.5">
              <span>Scout Field Logbook</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#2D6A4F] text-white">
                {logs.length}
              </span>
            </h4>
            <p className="text-[11px] text-[#837560]">
              Crowdsourced insider intel, packing gear, and tide observations for {spotName}.
            </p>
          </div>
        </div>

        {/* Dispatch Trigger Button */}
        <button
          type="button"
          onClick={() => setComposerOpen((prev) => !prev)}
          className="btn-tactile btn-sheen inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
          <span>{composerOpen ? 'Close Composer' : 'Log a Field Dispatch'}</span>
        </button>
      </div>

      {/* ================= COMPOSER DRAWER ================= */}
      {composerOpen && (
        <form
          onSubmit={handlePostDispatch}
          className="bg-white rounded-2xl border-2 border-[#2D6A4F]/30 p-4 sm:p-5 shadow-sm space-y-3.5 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#582F0E] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span>Record Explorer Field Note</span>
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {content.length}/600 chars
            </span>
          </div>

          {/* Tactical Flair Selector Chips */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Choose Dispatch Purpose:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TAG_CONFIG) as FieldLogTag[]).filter(t => t !== 'general').map((tagKey) => {
                const cfg = TAG_CONFIG[tagKey];
                const Icon = cfg.icon;
                const isSelected = selectedTag === tagKey;
                return (
                  <button
                    key={tagKey}
                    type="button"
                    onClick={() => setSelectedTag(tagKey)}
                    className={`btn-tactile inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isSelected
                        ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-amber-400/40 shadow-2xs`
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share specific road advice, best time for low tide, fee updates, or packing tips..."
            maxLength={600}
            className="w-full text-xs p-3 rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] text-[#2C221E] resize-none"
            required
          />

          {/* Optional Author Name for Guests */}
          {!user && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 shrink-0">Your Name:</span>
              <input
                type="text"
                value={authorNameInput}
                onChange={(e) => setAuthorNameInput(e.target.value)}
                placeholder="Scout Handle (e.g. Scout Miguel)"
                maxLength={40}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#E3DFD5] bg-[#FAF9F5] focus:bg-white text-[#2C221E]"
              />
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-stone-400">
              💡 Field logs earn Scout Reputation when marked helpful by fellow explorers.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim() || submitting}
                className="btn-tactile btn-sheen inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Post Dispatch</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      {logs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {filterOptions.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-[#582F0E] text-white shadow-2xs'
                  : 'bg-white text-[#582F0E] border border-[#E3DFD5] hover:bg-[#FAF9F5]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ================= LOGS STREAM ================= */}
      {loading ? (
        <div className="py-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#2D6A4F]" />
          <span>Syncing scout dispatches…</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E3DFD5] p-6 text-center space-y-2">
          <Compass className="w-8 h-8 text-stone-300 mx-auto" />
          <p className="text-xs font-bold text-[#582F0E]">No dispatches matching this filter yet.</p>
          <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
            Be the first scout to share an insider secret or tide note for this destination!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const cfg = TAG_CONFIG[log.tag] || TAG_CONFIG.general;
            const Icon = cfg.icon;
            const isHelpful = helpfulVoted[log.id];

            return (
              <article
                key={log.id}
                className="bg-white rounded-2xl border border-[#E3DFD5] p-3.5 sm:p-4 shadow-2xs space-y-2.5 transition hover:border-[#2D6A4F]/40"
              >
                {/* Author & Tag Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-black shrink-0">
                      {log.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#2C221E]">
                          {log.author_name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                          {log.author_badge}
                        </span>
                      </div>
                      <span className="text-[9px] text-stone-400 block font-mono">
                        {new Date(log.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Dispatch Flair Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cfg.label}</span>
                  </span>
                </div>

                {/* Content */}
                <p className="text-xs text-[#514532] leading-relaxed pl-9">
                  {log.content}
                </p>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-100 pl-9">
                  {log.is_verified_visit ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#2D6A4F]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified On-Site Visit</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400">Community Scout</span>
                  )}

                  {/* Helpful Endorsement Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleHelpful(log.id)}
                    className={`btn-tactile inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      isHelpful
                        ? 'bg-amber-100 text-[#B45309] border border-amber-300 scale-105'
                        : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <ThumbsUp className={`w-3 h-3 ${isHelpful ? 'fill-current' : ''}`} />
                    <span>Helpful ({log.helpful_count})</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
