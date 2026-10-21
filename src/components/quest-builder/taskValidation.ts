import { BuilderTask } from './types';

export interface ValidationError {
  field: string;
  message: string;
  taskIndex?: number;
}

export function validateQuestBuilder(state: {
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'published';
  tasks: BuilderTask[];
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!state.title.trim() || state.title.trim().length < 3) {
    errors.push({ field: 'title', message: 'Title must be at least 3 characters.' });
  } else if (state.title.trim().length > 100) {
    errors.push({ field: 'title', message: 'Title cannot exceed 100 characters.' });
  }

  if (!state.description.trim() || state.description.trim().length < 10) {
    errors.push({ field: 'description', message: 'Description must be at least 10 characters.' });
  }

  if (state.tasks.length > 10) {
    errors.push({ field: 'tasks', message: 'A quest cannot have more than 10 tasks.' });
  }

  if (state.status === 'published') {
    if (state.tasks.length === 0) {
      errors.push({ field: 'tasks', message: 'At least one task is required to publish.' });
    } else {
      const hasRequired = state.tasks.some((t) => t.required);
      if (!hasRequired) {
        errors.push({ field: 'tasks', message: 'At least one task must be marked as required to publish.' });
      }
    }
  }

  state.tasks.forEach((task, idx) => {
    if (!task.title.trim() || task.title.trim().length < 3) {
      errors.push({
        field: `tasks.${idx}.title`,
        message: 'Task title must be at least 3 characters.',
        taskIndex: idx,
      });
    }

    if (!task.description.trim() || task.description.trim().length < 5) {
      errors.push({
        field: `tasks.${idx}.description`,
        message: 'Task instructions must be at least 5 characters.',
        taskIndex: idx,
      });
    }

    if (task.checkpoint_type === 'photo') {
      const pCfg = task.verification as any;
      if (!pCfg.prompt || pCfg.prompt.trim().length < 5) {
        errors.push({
          field: `tasks.${idx}.prompt`,
          message: 'Photo prompt must be at least 5 characters.',
          taskIndex: idx,
        });
      }
    }

    if (task.checkpoint_type === 'action') {
      const aCfg = task.verification as any;
      if (aCfg.task?.kind === 'complete_quiz' && !aCfg.task.quiz_id) {
        errors.push({
          field: `tasks.${idx}.quiz_id`,
          message: 'Please select a cultural quiz.',
          taskIndex: idx,
        });
      }
      if ((aCfg.task?.kind === 'save_spot' || aCfg.task?.kind === 'like_spot') && !aCfg.task.spot_id) {
        errors.push({
          field: `tasks.${idx}.spot_id`,
          message: 'Please select a destination spot.',
          taskIndex: idx,
        });
      }
    }
  });

  return errors;
}
