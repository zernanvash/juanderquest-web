import { describe, it, expect, vi } from 'vitest';
import { getAvailableChapters, scrollToChapter, BASE_SPOT_CHAPTERS } from './spot-ui-chapters';

describe('spot-ui-chapters', () => {
  it('returns base chapters when no alternatives exist', () => {
    const chapters = getAvailableChapters(false);
    expect(chapters).toHaveLength(4);
    expect(chapters.map((c) => c.id)).toEqual(['spot-info', 'spot-about', 'spot-comments', 'spot-venue']);
  });

  it('includes Nearby alternatives chapter when alternatives exist', () => {
    const chapters = getAvailableChapters(true);
    expect(chapters).toHaveLength(5);
    expect(chapters[4]).toEqual({ id: 'spot-alternatives', label: 'Nearby' });
  });

  it('scrolls into view using smooth behavior when reduced motion is not preferred', () => {
    const scrollIntoView = vi.fn();
    const div = document.createElement('div');
    div.id = 'spot-about';
    div.scrollIntoView = scrollIntoView;
    document.body.appendChild(div);

    scrollToChapter('spot-about');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    document.body.removeChild(div);
  });
});
