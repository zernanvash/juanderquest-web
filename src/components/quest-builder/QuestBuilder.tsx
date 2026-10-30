'use client';

import React, { useReducer, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Save,
  Send,
  AlertCircle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { QuestBuilderState, BuilderTask, QUEST_CATEGORIES, questCategoryOrDefault } from './types';
import { TaskList } from './TaskList';
import { TravelerPreview } from './TravelerPreview';
import { validateQuestBuilder, ValidationError } from './taskValidation';
import { api } from '@/lib/api';

interface QuestBuilderProps {
  initialQuest?: any;
  destination: {
    id: string;
    name: string;
    slug: string;
    lat: number;
    lng: number;
    municipality?: string;
  };
  isNew?: boolean;
}

type Action =
  | { type: 'SET_FIELD'; field: keyof QuestBuilderState; value: any }
  | { type: 'ADD_TASK'; task: BuilderTask }
  | { type: 'UPDATE_TASK'; index: number; task: BuilderTask }
  | { type: 'MOVE_TASK_UP'; index: number }
  | { type: 'MOVE_TASK_DOWN'; index: number }
  | { type: 'DELETE_TASK'; index: number };

function builderReducer(state: QuestBuilderState, action: Action): QuestBuilderState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'ADD_TASK':
      if (state.tasks.length >= 10) return state;
      return {
        ...state,
        tasks: [
          ...state.tasks,
          { ...action.task, step_order: state.tasks.length + 1 },
        ],
      };
    case 'UPDATE_TASK': {
      const next = [...state.tasks];
      next[action.index] = { ...action.task, step_order: action.index + 1 };
      return { ...state, tasks: next };
    }
    case 'MOVE_TASK_UP': {
      if (action.index <= 0) return state;
      const next = [...state.tasks];
      const temp = next[action.index - 1];
      next[action.index - 1] = next[action.index];
      next[action.index] = temp;
      return {
        ...state,
        tasks: next.map((t, i) => ({ ...t, step_order: i + 1 })),
      };
    }
    case 'MOVE_TASK_DOWN': {
      if (action.index >= state.tasks.length - 1) return state;
      const next = [...state.tasks];
      const temp = next[action.index + 1];
      next[action.index + 1] = next[action.index];
      next[action.index] = temp;
      return {
        ...state,
        tasks: next.map((t, i) => ({ ...t, step_order: i + 1 })),
      };
    }
    case 'DELETE_TASK': {
      const next = state.tasks.filter((_, i) => i !== action.index);
      return {
        ...state,
        tasks: next.map((t, i) => ({ ...t, step_order: i + 1 })),
      };
    }
    default:
      return state;
  }
}

export function QuestBuilder({ initialQuest, destination, isNew = false }: QuestBuilderProps) {
  const router = useRouter();

  const getInitialTasks = (): BuilderTask[] => {
    if (initialQuest?.tasks?.length) return initialQuest.tasks;
    if (initialQuest?.steps?.length) {
      return initialQuest.steps.map((s: any, idx: number) => ({
        key: s.key || `task_init_${idx + 1}`,
        step_order: s.step_order || idx + 1,
        title: s.title || `Task ${idx + 1}`,
        description: s.description || '',
        required: s.required !== false,
        checkpoint_type: s.checkpoint_type || 'location',
        verification: s.verification || {
          type: 'location',
          fence: { lat: destination.lat, lng: destination.lng, radius_meters: 100 },
        },
      }));
    }
    // Default 1 task for new quest
    return [
      {
        key: 'task_loc_1',
        step_order: 1,
        title: `Arrive at ${destination.name}`,
        description: 'Check in near the main landmark or visitor entrance.',
        required: true,
        checkpoint_type: 'location',
        verification: {
          type: 'location',
          fence: { lat: destination.lat, lng: destination.lng, radius_meters: 100 },
        },
      },
    ];
  };

  const [state, dispatch] = useReducer(builderReducer, {
    title: initialQuest?.title || `Explore ${destination.name}`,
    description: initialQuest?.description || `Discover the cultural and scenic highlights of ${destination.name}.`,
    category: questCategoryOrDefault(initialQuest?.category),
    reward_points: (initialQuest?.reward_points || 50) as 50 | 75 | 100,
    step_order_mode: initialQuest?.step_order_mode || 'sequential',
    status: initialQuest?.status || 'draft',
    tasks: getInitialTasks(),
    version: initialQuest?.version || 1,
  });

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [clientErrors, setClientErrors] = useState<ValidationError[]>([]);
  const [serverError, setServerError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Mark dirty on edits
  useEffect(() => {
    setIsDirty(true);
  }, [state]);

  // Dirty navigation confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleAddTask = () => {
    const nextOrder = state.tasks.length + 1;
    const newTask: BuilderTask = {
      key: `task_new_${Date.now()}_${nextOrder}`,
      step_order: nextOrder,
      title: `Task ${nextOrder}`,
      description: 'Traveler instructions for this objective.',
      required: true,
      checkpoint_type: 'location',
      verification: {
        type: 'location',
        fence: { lat: destination.lat, lng: destination.lng, radius_meters: 100 },
      },
    };
    dispatch({ type: 'ADD_TASK', task: newTask });
  };

  const handleSaveOrPublish = async (targetStatus: 'draft' | 'published') => {
    const errors = validateQuestBuilder({ ...state, status: targetStatus });
    if (errors.length > 0) {
      setClientErrors(errors);
      return;
    }

    setClientErrors([]);
    setServerError('');
    if (targetStatus === 'published') setPublishing(true);
    else setSaving(true);

    try {
      const payload = {
        title: state.title.trim(),
        description: state.description.trim(),
        category: state.category,
        reward_points: state.reward_points,
        step_order_mode: state.step_order_mode,
        status: targetStatus,
        tasks: state.tasks.map((t) => ({
          key: t.key.startsWith('task_new_') ? undefined : t.key,
          step_order: t.step_order,
          title: t.title.trim(),
          description: t.description.trim(),
          required: t.required,
          checkpoint_type: t.checkpoint_type,
          verification: t.verification,
        })),
        ...(initialQuest?.id ? { expected_version: state.version } : {}),
      };

      let res: any;
      if (initialQuest?.id) {
        res = await api.patch(`/quests/${initialQuest.id}`, payload);
      } else {
        res = await api.post(`/spots/${destination.id}/quests`, payload);
      }

      setIsDirty(false);
      const questId = res.data?.data?.id || initialQuest?.id;

      if (targetStatus === 'published' && questId) {
        router.push(`/quests/${questId}`);
      } else if (questId) {
        router.push(`/quests/${questId}/edit`);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to save quest. Please review task fields.';
      setServerError(msg);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const hasQrTask = state.tasks.some((t) => t.checkpoint_type === 'qr');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/spots/${destination.slug}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {destination.name}
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#582F0E]">
              {isNew ? 'Create Multi-Task Quest' : 'Edit Quest Builder'}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                state.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {state.status}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Destination: <strong className="text-stone-700">{destination.name}</strong> · Authoring multi-task verification checkpoints (Plan 43).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {initialQuest?.id && hasQrTask && (
            <button
              type="button"
              onClick={() => router.push(`/quests/${initialQuest.id}/qr-sheet`)}
              className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>QR Sheet</span>
            </button>
          )}

          <button
            type="button"
            disabled={saving || publishing}
            onClick={() => handleSaveOrPublish('draft')}
            className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>

          <button
            type="button"
            disabled={saving || publishing}
            onClick={() => handleSaveOrPublish('published')}
            className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing…' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {serverError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{serverError}</span>
        </div>
      )}

      {clientErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <div className="font-bold">Please resolve the following before publishing:</div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800">
            {clientErrors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Basics & Task List */}
        <div className="lg:col-span-7 space-y-8">
          {/* Basics Card */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-black uppercase text-[#837560] tracking-wider">
              Quest Basics
            </h3>

            <div className="space-y-1.5">
              <label htmlFor="quest-title-input" className="block text-xs font-bold text-stone-700">Quest Title</label>
              <input
                id="quest-title-input"
                type="text"
                value={state.title}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'title', value: e.target.value })}
                placeholder="e.g., Hundred Islands Coastal Eco-Challenge"
                className="w-full p-3 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="quest-desc-input" className="block text-xs font-bold text-stone-700">Description</label>
              <textarea
                id="quest-desc-input"
                rows={3}
                value={state.description}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })}
                placeholder="Describe what travelers will experience and accomplish."
                className="w-full p-3 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="quest-cat-select" className="block text-xs font-bold text-stone-700">Category</label>
                <select
                  id="quest-cat-select"
                  value={state.category}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'category', value: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                >
                  {QUEST_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="quest-reward-select" className="block text-xs font-bold text-stone-700">Reward Points</label>
                <select
                  id="quest-reward-select"
                  value={state.reward_points}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'reward_points', value: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer font-bold"
                >
                  <option value={50}>50 Points</option>
                  <option value={75}>75 Points</option>
                  <option value={100}>100 Points</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">Order Mode</label>
                <div className="flex items-center gap-3 pt-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                    <input
                      type="radio"
                      name="order_mode"
                      value="sequential"
                      checked={state.step_order_mode === 'sequential'}
                      onChange={() => dispatch({ type: 'SET_FIELD', field: 'step_order_mode', value: 'sequential' })}
                      className="accent-emerald-700 cursor-pointer"
                    />
                    <span>In order</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                    <input
                      type="radio"
                      name="order_mode"
                      value="any"
                      checked={state.step_order_mode === 'any'}
                      onChange={() => dispatch({ type: 'SET_FIELD', field: 'step_order_mode', value: 'any' })}
                      className="accent-emerald-700 cursor-pointer"
                    />
                    <span>Any order</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <TaskList
            tasks={state.tasks}
            destinationCoords={{ lat: destination.lat, lng: destination.lng }}
            destinationSpotId={destination.id}
            onAddTask={handleAddTask}
            onUpdateTask={(index, updated) => dispatch({ type: 'UPDATE_TASK', index, task: updated })}
            onMoveUp={(index) => dispatch({ type: 'MOVE_TASK_UP', index })}
            onMoveDown={(index) => dispatch({ type: 'MOVE_TASK_DOWN', index })}
            onDeleteTask={(index) => dispatch({ type: 'DELETE_TASK', index })}
          />
        </div>

        {/* Right Preview Column (Sticky) */}
        <div className="lg:col-span-5 sticky top-24">
          <TravelerPreview
            title={state.title}
            category={state.category}
            rewardPoints={state.reward_points}
            stepOrderMode={state.step_order_mode}
            tasks={state.tasks}
          />
        </div>
      </div>
    </div>
  );
}
