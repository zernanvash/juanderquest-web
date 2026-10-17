import React, { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, Users, Trophy } from 'lucide-react';
import type { TownStandingItem } from '@/lib/plaza-api';

interface TownBoardProps {
  towns: TownStandingItem[];
}

export const TownBoard: React.FC<TownBoardProps> = ({ towns }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!towns || towns.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <div>
            <h3 className="text-xs sm:text-sm font-black text-[var(--color-brand-brown)] uppercase tracking-wider">
              Town vs Town This Week
            </h3>
            <span className="text-[10px] text-[var(--color-text-muted)] block">
              Municipal rankings based on combined explorer points
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand town standings' : 'Collapse town standings'}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          {towns.slice(0, 8).map((t) => (
            <div
              key={t.town}
              className={`p-3 rounded-xl border flex flex-col justify-between transition ${
                t.is_my_town
                  ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
                  : 'bg-[var(--color-bg-subtle)] border-[var(--color-border-default)]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-white border border-[var(--color-border-default)] text-gray-800">
                    #{t.rank}
                  </span>
                  {t.is_my_town && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      My Town
                    </span>
                  )}
                </div>
                <div className="pt-1">
                  <span className="text-xs font-bold text-[var(--color-brand-brown)] block truncate">
                    {t.town}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{t.active_explorers} active</span>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--color-border-subtle)] mt-2 flex items-center justify-between text-xs">
                <span className="font-black text-emerald-700">
                  {t.score_sum.toLocaleString()} pts
                </span>
                {t.top_explorer && (
                  <span className="text-[10px] text-gray-500 truncate max-w-[80px]" title={`Top explorer: ${t.top_explorer.display_name}`}>
                    👑 {t.top_explorer.display_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
