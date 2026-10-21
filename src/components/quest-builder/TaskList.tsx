'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { BuilderTask } from './types';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  tasks: BuilderTask[];
  destinationCoords: { lat: number; lng: number };
  destinationSpotId?: string;
  onAddTask: () => void;
  onUpdateTask: (index: number, updated: BuilderTask) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDeleteTask: (index: number) => void;
}

export function TaskList({
  tasks,
  destinationCoords,
  destinationSpotId,
  onAddTask,
  onUpdateTask,
  onMoveUp,
  onMoveDown,
  onDeleteTask,
}: TaskListProps) {
  const atMaxTasks = tasks.length >= 10;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-[#582F0E]">
            Quest Tasks ({tasks.length} / 10)
          </h3>
          <p className="text-xs text-stone-500">
            Define multi-step objectives that travelers must complete to claim their reward.
          </p>
        </div>

        <button
          type="button"
          disabled={atMaxTasks}
          onClick={onAddTask}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
            atMaxTasks
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none'
              : 'bg-[#2D6A4F] hover:bg-[#1B4332] text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Add task</span>
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 text-center space-y-2">
          <p className="text-sm font-bold text-stone-600">No tasks added yet.</p>
          <p className="text-xs text-stone-400">
            Press &ldquo;Add task&rdquo; above to create your first checkpoint verification.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {tasks.map((task, index) => (
            <TaskRow
              key={task.key || index}
              task={task}
              index={index}
              totalTasks={tasks.length}
              destinationCoords={destinationCoords}
              destinationSpotId={destinationSpotId}
              onUpdate={(updated) => onUpdateTask(index, updated)}
              onMoveUp={() => onMoveUp(index)}
              onMoveDown={() => onMoveDown(index)}
              onDelete={() => onDeleteTask(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
