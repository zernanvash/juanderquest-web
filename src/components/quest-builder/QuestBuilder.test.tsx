import { describe, it, expect } from 'vitest';
import { validateQuestBuilder } from './taskValidation';
import { BuilderTask } from './types';

describe('Quest Builder Validation & Reducer Logic (Plan 43 §5)', () => {
  const validTask: BuilderTask = {
    key: 'task_1',
    step_order: 1,
    title: 'Arrive at the destination',
    description: 'Check in near the visitor center.',
    required: true,
    checkpoint_type: 'location',
    verification: {
      type: 'location',
      fence: { lat: 16.03, lng: 120.33, radius_meters: 100 },
    },
  };

  it('validates minimum quest title and description', () => {
    const errors = validateQuestBuilder({
      title: 'A',
      description: 'Short',
      category: 'eco_tourism',
      status: 'draft',
      tasks: [validTask],
    });

    expect(errors.some((e) => e.field === 'title')).toBe(true);
    expect(errors.some((e) => e.field === 'description')).toBe(true);
  });

  it('requires at least one task and one required task to publish', () => {
    const noTasksErrors = validateQuestBuilder({
      title: 'Valid Quest Title',
      description: 'A completely valid description for this quest.',
      category: 'eco_tourism',
      status: 'published',
      tasks: [],
    });
    expect(noTasksErrors.some((e) => e.message.includes('At least one task is required'))).toBe(true);

    const noRequiredErrors = validateQuestBuilder({
      title: 'Valid Quest Title',
      description: 'A completely valid description for this quest.',
      category: 'eco_tourism',
      status: 'published',
      tasks: [{ ...validTask, required: false }],
    });
    expect(noRequiredErrors.some((e) => e.message.includes('must be marked as required'))).toBe(true);
  });

  it('validates photo task prompt requirement', () => {
    const photoTask: BuilderTask = {
      key: 'task_photo_1',
      step_order: 2,
      title: 'Scenic Sunset Photo',
      description: 'Capture the golden hour reflection on the ocean.',
      required: true,
      checkpoint_type: 'photo',
      verification: {
        type: 'photo',
        prompt: 'Pic', // Too short (<5 chars)
        fence: null,
        require_gps: false,
      },
    };

    const errors = validateQuestBuilder({
      title: 'Valid Quest Title',
      description: 'A completely valid description for this quest.',
      category: 'eco_tourism',
      status: 'published',
      tasks: [validTask, photoTask],
    });

    expect(errors.some((e) => e.field === 'tasks.1.prompt')).toBe(true);
  });

  it('rejects quests with more than 10 tasks', () => {
    const tenTasks = Array.from({ length: 11 }, (_, i) => ({
      ...validTask,
      key: `task_${i + 1}`,
      step_order: i + 1,
    }));

    const errors = validateQuestBuilder({
      title: 'Valid Quest Title',
      description: 'A completely valid description for this quest.',
      category: 'eco_tourism',
      status: 'draft',
      tasks: tenTasks,
    });

    expect(errors.some((e) => e.message.includes('cannot have more than 10 tasks'))).toBe(true);
  });
});
