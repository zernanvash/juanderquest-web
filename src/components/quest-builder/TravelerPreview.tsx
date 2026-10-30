'use client';

import React from 'react';
import {
  MapPin,
  QrCode,
  Camera,
  Sparkles,
  HelpCircle,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { BuilderTask } from './types';

interface TravelerPreviewProps {
  title: string;
  category: string;
  rewardPoints: number;
  stepOrderMode: 'sequential' | 'any';
  tasks: BuilderTask[];
}

export function TravelerPreview({
  title,
  category,
  rewardPoints,
  stepOrderMode,
  tasks,
}: TravelerPreviewProps) {
  const getMethodBadge = (type: string, scanMode?: string) => {
    switch (type) {
      case 'location':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <MapPin className="w-3 h-3" /> Location
          </span>
        );
      case 'qr':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <QrCode className="w-3 h-3" /> {scanMode === 'host_scans_traveler' ? 'Host scans your pass' : 'QR code'}
          </span>
        );
      case 'photo':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Camera className="w-3 h-3" /> Photo
          </span>
        );
      case 'ar':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            <Sparkles className="w-3 h-3" /> AR (app)
          </span>
        );
      case 'action':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
            <HelpCircle className="w-3 h-3" /> In-app
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-[#FAF9F5] border border-[#E3DFD5] shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#837560]">
          Traveler Live Preview
        </span>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          +{rewardPoints} Points
        </span>
      </div>

      <div>
        <h4 className="font-black text-sm text-[#2C221E] leading-snug">
          {title || 'Untitled Quest'}
        </h4>
        <p className="text-[11px] text-stone-500 mt-0.5">
          Order mode: <strong className="text-stone-700">{stepOrderMode === 'sequential' ? 'In order (Sequential)' : 'Any order (Checklist)'}</strong>
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        {tasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400">
            Add tasks on the left to see traveler progression preview.
          </div>
        ) : (
          tasks.map((task, idx) => {
            const isLocked = stepOrderMode === 'sequential' && idx > 0;

            return (
              <div
                key={task.key || idx}
                className={`p-3 rounded-2xl border transition-all ${
                  isLocked
                    ? 'bg-stone-50/70 border-stone-200/80 opacity-70'
                    : 'bg-white border-stone-200 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 text-[10px] font-black text-stone-700 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs text-stone-900 leading-tight">
                        {task.title || `Task ${idx + 1}`}
                      </h5>
                      <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                        {task.description || 'Instructions will be displayed here.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {getMethodBadge(task.checkpoint_type, (task.verification as { scan_mode?: string } | undefined)?.scan_mode)}
                    {isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Ready
                      </span>
                    )}
                  </div>
                </div>

                {task.checkpoint_type === 'ar' && (
                  <div className="mt-2 pt-2 border-t border-purple-100 text-[10px] text-purple-700 font-medium">
                    📱 Open JuanDerQuest app to collect 3D {task.verification && (task.verification as any).object}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
