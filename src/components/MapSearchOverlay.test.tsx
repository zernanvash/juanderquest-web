import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapSearchOverlay } from './MapSearchOverlay';

describe('MapSearchOverlay', () => {
  const defaultProps = {
    onSelectArea: vi.fn(),
    onSelectDestination: vi.fn(),
    activeArea: null,
    onClearActiveArea: vi.fn(),
    spots: [],
    quests: [],
  };

  it('renders with role="search" and aria-label', () => {
    render(<MapSearchOverlay {...defaultProps} />);
    const searchOverlay = screen.getByRole('search', { name: /search the map/i });
    expect(searchOverlay).toBeTruthy();
  });

  it('focuses input on "/" keypress when not in another input', () => {
    render(<MapSearchOverlay {...defaultProps} />);
    const input = screen.getByRole('textbox');
    expect(document.activeElement).not.toBe(input);

    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(input);
  });
});
