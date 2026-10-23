import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CosmeticAvatar } from './CosmeticAvatar';
import { DisplayName } from './DisplayName';
import { ProfileBanner } from './ProfileBanner';

describe('cosmetic profile components', () => {
  it('renders an avatar without cosmetics without changing its accessible identity', () => {
    render(<CosmeticAvatar name="Traveler" size="md" />);
    expect(screen.getByLabelText('Traveler avatar')).toBeTruthy();
  });

  it('renders equipped frame, title and name color', () => {
    render(<><CosmeticAvatar name="Traveler" frame={{ id: 'frame-bamboo', asset: { colors: ['#95d5b2'], width: 3 } }} />
      <DisplayName name="Traveler" title={{ asset: { text: 'Island Hopper' } }} nameColor={{ asset: { color: '#2d6a4f' } }} /></>);
    expect(screen.getByLabelText('frame-bamboo avatar frame')).toBeTruthy();
    expect(screen.getByText('Island Hopper')).toBeTruthy();
    expect(screen.getByText('Traveler').getAttribute('style')).toContain('rgb(45, 106, 79)');
  });

  it('labels a banner and draws its gradient', () => {
    render(<ProfileBanner asset={{ colors: ['#f4a261', '#e76f51'], angle: 135, pattern: 'sun' }} />);
    expect(screen.getByLabelText('Profile banner').getAttribute('style')).toContain('linear-gradient');
  });
});
