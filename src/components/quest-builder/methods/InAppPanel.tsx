'use client';

import React from 'react';
import { BookOpen, Heart, Bookmark, Vote } from 'lucide-react';
import { ActionCfg, InAppTask } from '../types';

interface InAppPanelProps {
  config: ActionCfg;
  destinationSpotId?: string;
  onChange: (updated: ActionCfg) => void;
}

export function InAppPanel({ config, destinationSpotId, onChange }: InAppPanelProps) {
  const { task } = config;

  const handleKindSelect = (kind: InAppTask['kind']) => {
    switch (kind) {
      case 'complete_quiz':
        onChange({
          ...config,
          task: { kind: 'complete_quiz', quiz_id: '' },
        });
        break;
      case 'save_spot':
        onChange({
          ...config,
          task: { kind: 'save_spot', spot_id: destinationSpotId || '' },
        });
        break;
      case 'like_spot':
        onChange({
          ...config,
          task: { kind: 'like_spot', spot_id: destinationSpotId || '' },
        });
        break;
      case 'vote_juanchoice':
        onChange({
          ...config,
          task: { kind: 'vote_juanchoice' },
        });
        break;
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700">Digital In-App Action</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleKindSelect('save_spot')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs font-bold transition-all cursor-pointer ${
              task.kind === 'save_spot'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
            }`}
          >
            <Bookmark className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <div>Bookmark Destination</div>
              <div className="font-normal text-[11px] text-stone-500 mt-0.5">
                Traveler saves destination to their itinerary.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleKindSelect('like_spot')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs font-bold transition-all cursor-pointer ${
              task.kind === 'like_spot'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div>Like Destination</div>
              <div className="font-normal text-[11px] text-stone-500 mt-0.5">
                Traveler likes the destination on the explore feed.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleKindSelect('complete_quiz')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs font-bold transition-all cursor-pointer ${
              task.kind === 'complete_quiz'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div>Cultural Quiz Challenge</div>
              <div className="font-normal text-[11px] text-stone-500 mt-0.5">
                Complete a cultural heritage quiz in the app.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleKindSelect('vote_juanchoice')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs font-bold transition-all cursor-pointer ${
              task.kind === 'vote_juanchoice'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
            }`}
          >
            <Vote className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <div>JuanChoice Governance Vote</div>
              <div className="font-normal text-[11px] text-stone-500 mt-0.5">
                Cast a vote in the active community campaign.
              </div>
            </div>
          </button>
        </div>
      </div>

      {task.kind === 'complete_quiz' && (
        <div className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
          <label htmlFor="quiz-id-input" className="block text-xs font-bold text-stone-700">Cultural Quiz ID</label>
          <input
            id="quiz-id-input"
            type="text"
            value={task.quiz_id}
            onChange={(e) =>
              onChange({
                ...config,
                task: { ...task, quiz_id: e.target.value },
              })
            }
            placeholder="e.g., quiz_lingayen_history_01"
            className="w-full p-2.5 rounded-lg border border-stone-200 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <p className="text-[10px] text-stone-400">
            Traveler must complete this cultural quiz after beginning the quest attempt.
          </p>
        </div>
      )}

      {(task.kind === 'save_spot' || task.kind === 'like_spot') && (
        <div className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
          <label htmlFor="target-spot-id-input" className="block text-xs font-bold text-stone-700">Target Destination Spot ID</label>
          <input
            id="target-spot-id-input"
            type="text"
            value={task.spot_id}
            onChange={(e) =>
              onChange({
                ...config,
                task: { ...task, spot_id: e.target.value },
              })
            }
            placeholder="e.g., spot_patar_beach_01"
            className="w-full p-2.5 rounded-lg border border-stone-200 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <p className="text-[10px] text-stone-400">
            Defaults to this destination spot. Traveler interaction is verified server-side.
          </p>
        </div>
      )}

      <div className="p-3 bg-stone-100 rounded-xl text-xs text-stone-600">
        🛡️ <strong>Server-Verified:</strong> Digital in-app actions are verified directly against the database at submission time. The client does not self-assert completion.
      </div>
    </div>
  );
}
