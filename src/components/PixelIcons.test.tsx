import { describe, expect, it, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PixelSearchIcon, PixelHeart, PixelHeartButton } from './PixelIcons';

describe('PixelIcons', () => {
  describe('PixelSearchIcon', () => {
    it('renders with default search icon image source and pixel-art classes', () => {
      render(<PixelSearchIcon data-testid="pixel-search" />);
      const img = screen.getByTestId('pixel-search') as HTMLImageElement;
      expect(img).toBeDefined();
      expect(img.getAttribute('src')).toBe('/icons/search.png');
      expect(img.className).toContain('pixel-art-icon');
    });

    it('respects custom size prop and className', () => {
      render(<PixelSearchIcon size={24} className="custom-test-class" data-testid="pixel-search-custom" />);
      const img = screen.getByTestId('pixel-search-custom') as HTMLImageElement;
      expect(img.getAttribute('width')).toBe('24');
      expect(img.getAttribute('height')).toBe('24');
      expect(img.className).toContain('custom-test-class');
    });
  });

  describe('PixelHeart', () => {
    it('renders static unliked sprite on initial load when isLiked is false', () => {
      const { container } = render(<PixelHeart isLiked={false} />);
      const sprite = container.querySelector('.pixel-heart-sprite');
      expect(sprite).toBeDefined();
      expect(sprite?.className).toContain('pixel-heart-static-unliked');
      expect(sprite?.getAttribute('data-anim-state')).toBe('idle');
    });

    it('renders static liked sprite on initial load when isLiked is true', () => {
      const { container } = render(<PixelHeart isLiked={true} />);
      const sprite = container.querySelector('.pixel-heart-sprite');
      expect(sprite).toBeDefined();
      expect(sprite?.className).toContain('pixel-heart-static-liked');
      expect(sprite?.getAttribute('data-anim-state')).toBe('idle');
    });

    it('transitions to liking animation when isLiked flips from false to true', () => {
      const TestWrapper = () => {
        const [liked, setLiked] = useState(false);
        return (
          <div>
            <button onClick={() => setLiked(true)}>Like</button>
            <PixelHeart isLiked={liked} />
          </div>
        );
      };

      const { container } = render(<TestWrapper />);
      let sprite = container.querySelector('.pixel-heart-sprite');
      expect(sprite?.className).toContain('pixel-heart-static-unliked');

      // Click like
      fireEvent.click(screen.getByText('Like'));

      sprite = container.querySelector('.pixel-heart-sprite');
      expect(sprite?.className).toContain('pixel-heart-anim-like');
      expect(sprite?.getAttribute('data-anim-state')).toBe('liking');
    });

    it('transitions to unliking animation when isLiked flips from true to false', () => {
      const TestWrapper = () => {
        const [liked, setLiked] = useState(true);
        return (
          <div>
            <button onClick={() => setLiked(false)}>Unlike</button>
            <PixelHeart isLiked={liked} />
          </div>
        );
      };

      const { container } = render(<TestWrapper />);
      let sprite = container.querySelector('.pixel-heart-sprite');
      expect(sprite?.className).toContain('pixel-heart-static-liked');

      // Click unlike
      fireEvent.click(screen.getByText('Unlike'));

      sprite = container.querySelector('.pixel-heart-sprite');
      expect(sprite?.className).toContain('pixel-heart-anim-unlike');
      expect(sprite?.getAttribute('data-anim-state')).toBe('unliking');
    });

    it('resets animation state to idle and fires onAnimationComplete when animation ends', () => {
      vi.useFakeTimers();
      const onComplete = vi.fn();
      const TestWrapper = () => {
        const [liked, setLiked] = useState(false);
        return (
          <div>
            <button onClick={() => setLiked(true)}>Like</button>
            <PixelHeart isLiked={liked} onAnimationComplete={onComplete} />
          </div>
        );
      };

      const { container } = render(<TestWrapper />);
      fireEvent.click(screen.getByText('Like'));

      let sprite = container.querySelector('.pixel-heart-sprite');
      expect(sprite?.className).toContain('pixel-heart-anim-like');
      expect(sprite?.getAttribute('data-anim-state')).toBe('liking');

      // Fast-forward animation timer
      act(() => {
        vi.advanceTimersByTime(500);
      });

      const updatedSprite = container.querySelector('.pixel-heart-sprite');
      expect(updatedSprite?.className).toContain('pixel-heart-static-liked');
      expect(updatedSprite?.getAttribute('data-anim-state')).toBe('idle');
      expect(onComplete).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe('PixelHeartButton', () => {
    it('triggers onToggle callback on click', () => {
      const onToggle = vi.fn();
      render(<PixelHeartButton isLiked={false} onToggle={onToggle} label="Like" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('displays count when count > 0 is provided', () => {
      render(<PixelHeartButton isLiked={true} onToggle={vi.fn()} count={42} />);
      expect(screen.getByText('42')).toBeDefined();
    });
  });
});
