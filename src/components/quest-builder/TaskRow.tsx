'use client';

import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  MapPin,
  QrCode,
  Camera,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { BuilderTask, VerificationMethod } from './types';
import { LocationPanel } from './methods/LocationPanel';
import { QrPanel } from './methods/QrPanel';
import { PhotoPanel } from './methods/PhotoPanel';
import { ArPanel } from './methods/ArPanel';
import { InAppPanel } from './methods/InAppPanel';

interface TaskRowProps {
  task: BuilderTask;
  index: number;
  totalTasks: number;
  destinationCoords: { lat: number; lng: number };
  destinationSpotId?: string;
  onUpdate: (updated: BuilderTask) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function TaskRow({
  task,
  index,
  totalTasks,
  destinationCoords,
  destinationSpotId,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: TaskRowProps) {
  const handleMethodChange = (newMethod: VerificationMethod) => {
    if (newMethod === task.checkpoint_type) return;

    let defaultVerification: any;
    switch (newMethod) {
      case 'location':
        defaultVerification = {
          type: 'location',
          fence: { lat: destinationCoords.lat, lng: destinationCoords.lng, radius_meters: 100 },
        };
        break;
      case 'qr':
        defaultVerification = {
          type: 'qr',
          fence: { lat: destinationCoords.lat, lng: destinationCoords.lng, radius_meters: 80 },
        };
        break;
      case 'photo':
        defaultVerification = {
          type: 'photo',
          prompt: 'Take a photo of this destination landmark.',
          fence: { lat: destinationCoords.lat, lng: destinationCoords.lng, radius_meters: 100 },
          require_gps: true,
        };
        break;
      case 'ar':
        defaultVerification = {
          type: 'ar',
          fence: { lat: destinationCoords.lat, lng: destinationCoords.lng, radius_meters: 50 },
          object: 'token',
          color: '#FFB703',
        };
        break;
      case 'action':
        defaultVerification = {
          type: 'action',
          task: { kind: 'save_spot', spot_id: destinationSpotId || '' },
        };
        break;
    }

    onUpdate({
      ...task,
      checkpoint_type: newMethod,
      verification: defaultVerification,
    });
  };

  return (
    <div
      className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-4 transition-all"
      data-testid={`builder-task-row-${index}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          {/* Accessible Reorder buttons */}
          <div className="flex items-center rounded-lg border border-stone-200 overflow-hidden shrink-0 bg-stone-50">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              aria-label={`Move task ${index + 1} up`}
              className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-stone-200" />
            <button
              type="button"
              disabled={index === totalTasks - 1}
              onClick={onMoveDown}
              aria-label={`Move task ${index + 1} down`}
              className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="font-black text-sm text-[#2C221E]">Task {index + 1}</span>

          {/* Verification Method Select */}
          <select
            value={task.checkpoint_type}
            onChange={(e) => handleMethodChange(e.target.value as VerificationMethod)}
            className="text-xs font-bold px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="location">Location</option>
            <option value="qr">QR code</option>
            <option value="photo">Photo</option>
            <option value="ar">AR (app)</option>
            <option value="action">In-app task</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-stone-700">
            <input
              type="checkbox"
              checked={task.required}
              onChange={(e) => onUpdate({ ...task, required: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-700 accent-emerald-700 cursor-pointer"
            />
            <span>Required</span>
          </label>

          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete task ${index + 1}`}
            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Title & Instructions */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-stone-700">Task Title</label>
          <input
            type="text"
            value={task.title}
            onChange={(e) => onUpdate({ ...task, title: e.target.value })}
            placeholder="e.g., Arrive at the beach or Scan heritage marker"
            className="w-full p-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-stone-700">Traveler Instructions</label>
          <input
            type="text"
            value={task.description}
            onChange={(e) => onUpdate({ ...task, description: e.target.value })}
            placeholder="e.g., Check in within 100 meters of the main entrance gate."
            className="w-full p-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Sub-method Panel */}
      <div className="mt-2 pt-2 border-t border-stone-100">
        {task.checkpoint_type === 'location' && (
          <LocationPanel
            config={task.verification as any}
            destinationCoords={destinationCoords}
            onChange={(cfg) => onUpdate({ ...task, verification: cfg })}
          />
        )}
        {task.checkpoint_type === 'qr' && (
          <QrPanel
            config={task.verification as any}
            destinationCoords={destinationCoords}
            onChange={(cfg) => onUpdate({ ...task, verification: cfg })}
          />
        )}
        {task.checkpoint_type === 'photo' && (
          <PhotoPanel
            config={task.verification as any}
            destinationCoords={destinationCoords}
            onChange={(cfg) => onUpdate({ ...task, verification: cfg })}
          />
        )}
        {task.checkpoint_type === 'ar' && (
          <ArPanel
            config={task.verification as any}
            destinationCoords={destinationCoords}
            onChange={(cfg) => onUpdate({ ...task, verification: cfg })}
          />
        )}
        {task.checkpoint_type === 'action' && (
          <InAppPanel
            config={task.verification as any}
            destinationSpotId={destinationSpotId}
            onChange={(cfg) => onUpdate({ ...task, verification: cfg })}
          />
        )}
      </div>
    </div>
  );
}
