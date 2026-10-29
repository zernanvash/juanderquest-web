import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { SpotPostingWizard } from './SpotPostingWizard';
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

function renderComposer(overrides: Partial<React.ComponentProps<typeof SpotPostingWizard>> = {}) {
  const props = { pin, minimized: false, onClose: vi.fn(), onRequestMovePin: vi.fn(), onPublished: vi.fn(), ...overrides };
  const view = render(<SpotPostingWizard {...props} />);
  return { props, view };
}

describe('SpotPostingWizard — one-page Smart Draft (Plan 66)', () => {
  beforeEach(() => {
    apiMock.post.mockReset();
    uploadMock.mockReset();
    invalidateCacheMock.mockReset();
    recognizeMock.mockReset();
    recognizeMock.mockResolvedValue(recognition());
  });

  it('pre-fills location, name, category and visitor details from recognition, with no step pages or raw coordinates', async () => {
    renderComposer();
    expect(await screen.findByDisplayValue('Patar White Beach')).toBeTruthy();
    expect(screen.getByText('Brgy. Patar, Bolinao')).toBeTruthy();
    expect(screen.getByText('Patar Road, Brgy. Patar, Bolinao, Pangasinan')).toBeTruthy();
    expect(screen.getByText(/auto-filled from map/i)).toBeTruthy();
    expect(screen.getByRole('radio', { name: /nature & beaches/i }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /white sand beach/i }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(/Families & kids & Groups & barkada & Couples · Early morning\/Sunset · 06:00 AM - 06:00 PM/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^next$/i })).toBeNull();
    expect(screen.queryByText(/step \d of/i)).toBeNull();
    expect(screen.getByRole('dialog').textContent).not.toMatch(/\b\d{1,3}\.\d{4,}\b/);
  });

  it('uses the aim card recognition without a second lookup', async () => {
    renderComposer({ initialRecognition: recognition() });
    expect(screen.getByDisplayValue('Patar White Beach')).toBeTruthy();
    await act(async () => {});
    expect(recognizeMock).not.toHaveBeenCalled();
  });

  it('builds the description with one story-starter tap and publishes in one tap', async () => {
    apiMock.post.mockResolvedValue({ data: { success: true, data: { id: 'spot-new-1', name: 'Patar White Beach' } } });
    const { props } = renderComposer();
    await screen.findByDisplayValue('Patar White Beach');
    expect(screen.getByText(/tap a story starter/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /\+ Patar White Beach in Brgy\. Patar/ }));
    expect((screen.getByLabelText(/what makes it worth visiting/i) as HTMLTextAreaElement).value)
      .toBe('Patar White Beach in Brgy. Patar, Bolinao with relaxing views and fresh air.');
    expect(screen.getByText(/ready to publish/i)).toBeTruthy();

    const publish = screen.getByRole('button', { name: /publish spot/i });
    fireEvent.click(publish);
    fireEvent.click(publish);
    await screen.findByText(/destination published/i);
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      name: 'Patar White Beach', category: 'nature_outdoors', subcategory: 'white_sand_beach', municipality: 'Bolinao',
      address: 'Patar Road, Brgy. Patar, Bolinao, Pangasinan', gps_lat: pin.lat, gps_lng: pin.lng,
      good_for: ['families', 'groups', 'couples'], best_time: ['early_morning', 'sunset'], amenities: ['parking', 'restrooms'],
      hours: { daily: '06:00 AM - 06:00 PM' },
    });
    expect(invalidateCacheMock).toHaveBeenCalledWith('spots');
    expect(props.onPublished).toHaveBeenCalledWith(expect.objectContaining({ id: 'spot-new-1' }));
    expect(screen.getByRole('link', { name: /trails & directions/i }).getAttribute('href')).toBe('/map?spot=spot-new-1&trip=1');
  });

  it('keeps what the traveler typed when the pin moves and recognition runs again', async () => {
    const { view, props } = renderComposer();
    await screen.findByDisplayValue('Patar White Beach');
    fireEvent.change(screen.getByLabelText(/destination name/i), { target: { value: 'My Secret Cove' } });
    recognizeMock.mockResolvedValue(recognition({ place_name: 'Other Beach', municipality: 'Anda', formatted_address: 'Brgy. Tondol, Anda, Pangasinan' }));
    view.rerender(<SpotPostingWizard {...props} pin={{ lat: 16.31, lng: 119.95 }} />);
    expect(await screen.findByText('Brgy. Tondol, Anda, Pangasinan')).toBeTruthy();
    expect(screen.getByDisplayValue('My Secret Cove')).toBeTruthy();
    expect(recognizeMock).toHaveBeenCalledTimes(2);
  });

  it('asks for a name when nothing was recognized, offering suggestion chips', async () => {
    recognizeMock.mockResolvedValue(recognition({ place_name: null, name_suggestions: ['Patar Viewpoint'] }));
    renderComposer();
    expect(await screen.findByText(/add a name for this place/i)).toBeTruthy();
    fireEvent.click(within(screen.getByLabelText('Name suggestions')).getByRole('button', { name: 'Patar Viewpoint' }));
    expect(screen.getByDisplayValue('Patar Viewpoint')).toBeTruthy();
  });

  it('warns about a nearby existing spot and lets the traveler adjust the pin', async () => {
    recognizeMock.mockResolvedValue(recognition({ nearby_duplicates: [{ id: 'spot-patar', slug: 'patar', name: 'Patar Rock Formation', category: 'nature_outdoors', municipality: 'Bolinao', distance_meters: 42 }] }));
    const { props } = renderComposer();
    expect(await screen.findByText('Patar Rock Formation')).toBeTruthy();
    expect(screen.getByText(/42 m away/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /view existing spot/i }).getAttribute('href')).toBe('/spots/spot-patar');
    fireEvent.click(screen.getByRole('button', { name: /adjust pin/i }));
    expect(props.onRequestMovePin).toHaveBeenCalledTimes(1);
  });

  it('offers camera capture and a gallery picker, uploading right away', async () => {
    uploadMock.mockResolvedValue({ asset_id: 'asset-1', url: 'https://cdn/x.jpg', media_type: 'image' });
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    renderComposer();
    await screen.findByDisplayValue('Patar White Beach');
    expect(screen.getByTestId('camera-input').getAttribute('capture')).toBe('environment');
    fireEvent.change(screen.getByTestId('gallery-input'), { target: { files: [new File(['x'], 'beach.jpg', { type: 'image/jpeg' })] } });
    await screen.findByText(/uploaded · cover photo/i);
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft when publishing fails and succeeds on retry', async () => {
    apiMock.post
      .mockRejectedValueOnce({ response: { data: { error: { message: 'Destination temporarily unavailable. Please try again.' } } } })
      .mockResolvedValueOnce({ data: { success: true, data: { id: 'spot-new-2', name: 'Patar White Beach' } } });
    renderComposer();
    await screen.findByDisplayValue('Patar White Beach');
    fireEvent.click(screen.getByRole('button', { name: /\+ Great stop for photos/ }));
    fireEvent.click(screen.getByRole('button', { name: /publish spot/i }));
    expect(await screen.findByText(/destination temporarily unavailable/i)).toBeTruthy();
    expect(screen.getByDisplayValue('Patar White Beach')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /publish spot/i }));
    await screen.findByText(/destination published/i);
    expect(apiMock.post).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape but not while publishing', async () => {
    const { props } = renderComposer();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
    apiMock.post.mockImplementation(() => new Promise(() => {}));
    await screen.findByDisplayValue('Patar White Beach');
    fireEvent.click(screen.getByRole('button', { name: /\+ Great stop for photos/ }));
    fireEvent.click(screen.getByRole('button', { name: /publish spot/i }));
    expect(screen.getByRole('button', { name: /close posting wizard/i }).hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
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
