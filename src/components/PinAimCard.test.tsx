import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PinAimCard, RECOGNIZE_DEBOUNCE_MS } from './PinAimCard';
import type { SpotRecognition } from '@/lib/spot-posting';

const apiMock = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
const uploadMock = vi.hoisted(() => vi.fn());
const invalidateCacheMock = vi.hoisted(() => vi.fn());
const recognizeMock = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api', () => ({ api: apiMock, normalizeSpot: (spot: unknown) => spot, uploadSpotMedia: uploadMock }));
vi.mock('@/lib/cache', () => ({ invalidateCache: invalidateCacheMock }));
vi.mock('@/lib/reverse-geocode', () => ({ recognizeSpot: recognizeMock }));

const pin = { lat: 16.3268, lng: 119.7842 };
const recognition = (overrides: Partial<SpotRecognition> = {}): SpotRecognition => ({
  recognized: true, source: 'osm', place_name: 'Patar White Beach',
  name_suggestions: ['Patar White Beach', 'Patar Beach', 'Bolinao Beach'],
  formatted_address: 'Patar Road, Brgy. Patar, Bolinao, Pangasinan', municipality: 'Bolinao', barangay: 'Brgy. Patar', province: 'Pangasinan',
  road: 'Patar Road', outside_pangasinan: false, suggested_category: 'nature_outdoors', suggested_subcategory: 'beach',
  suggested_details: { good_for: ['families', 'groups', 'couples'], best_time: ['early_morning', 'sunset'], amenities: ['parking', 'restrooms'], daily_hours: '06:00 AM - 06:00 PM', contact_number: '' },
  story_starters: [
    'Patar White Beach in Brgy. Patar, Bolinao with relaxing views and fresh air.',
    'Great stop for photos and sunset watching, and easy to reach from the main road.',
  ],
  nearby_duplicates: [],
  ...overrides,
});

describe('PinAimCard — live recognized place (Plan 66 stage 1)', () => {
  beforeEach(() => { recognizeMock.mockReset(); recognizeMock.mockResolvedValue(recognition()); });

  it('recognizes the crosshair after a short debounce and continues with that place', async () => {
    vi.useFakeTimers();
    try {
      const onContinue = vi.fn();
      render(<PinAimCard center={pin} onContinue={onContinue} onUseMyLocation={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText(/recognizing this place/i)).toBeTruthy();
      expect(recognizeMock).not.toHaveBeenCalled();
      await act(async () => { vi.advanceTimersByTime(RECOGNIZE_DEBOUNCE_MS); });
      expect(recognizeMock).toHaveBeenCalledWith(pin.lat, pin.lng, expect.any(AbortSignal));
      vi.useRealTimers();
      expect(await screen.findByRole('heading', { name: 'Patar White Beach' })).toBeTruthy();
      expect(screen.getByText('Patar Road, Brgy. Patar, Bolinao, Pangasinan')).toBeTruthy();
      expect(screen.getByText(/nature & beaches · beach/i)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /continue with this place/i }));
      expect(onContinue).toHaveBeenCalledWith(pin, expect.objectContaining({ place_name: 'Patar White Beach' }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('names an unnamed place by barangay and town, and offers my location and cancel', async () => {
    recognizeMock.mockResolvedValue(recognition({ place_name: null }));
    const onUseMyLocation = vi.fn(); const onCancel = vi.fn();
    render(<PinAimCard center={pin} onContinue={vi.fn()} onUseMyLocation={onUseMyLocation} onCancel={onCancel} />);
    expect(await screen.findByRole('heading', { name: 'New spot in Brgy. Patar, Bolinao' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel adding a spot/i }));
    expect(onUseMyLocation).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
