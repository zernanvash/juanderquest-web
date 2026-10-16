import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SpotPostingWizard } from './SpotPostingWizard';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
const uploadMock = vi.hoisted(() => vi.fn());
const invalidateCacheMock = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/api', () => ({
  api: apiMock,
  normalizeSpot: (spot: unknown) => spot,
  isVideoMedia: (url: unknown) => typeof url === 'string' && /\.(mp4|webm)$/i.test(url),
  uploadSpotMedia: uploadMock,
}));
vi.mock('@/lib/cache', () => ({ invalidateCache: invalidateCacheMock }));

const pin = { lat: 15.9083, lng: 119.7892 };

function renderWizard(overrides: Partial<React.ComponentProps<typeof SpotPostingWizard>> = {}) {
  const props = {
    pin,
    minimized: false,
    onClose: vi.fn(),
    onRequestMovePin: vi.fn(),
    onPublished: vi.fn(),
    ...overrides,
  };
  const view = render(<SpotPostingWizard {...props} />);
  return { props, view };
}

async function advanceToReview() {
  fireEvent.change(screen.getByLabelText(/destination name/i), {
    target: { value: 'Tambobong White Beach' },
  });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  fireEvent.change(screen.getByLabelText(/what makes it worth visiting/i), {
    target: { value: 'A quiet stretch of white sand with calm water for swimming and picnics.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  fireEvent.change(screen.getByLabelText(/municipality \/ city/i), { target: { value: 'Dasol' } });
  fireEvent.change(screen.getByLabelText(/address \/ landmark/i), {
    target: { value: 'Brgy. Tambobong, Dasol' },
  });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  await screen.findByRole('button', { name: /publish destination/i });
}

describe('SpotPostingWizard', () => {
  beforeEach(() => {
    apiMock.post.mockReset();
    uploadMock.mockReset();
    invalidateCacheMock.mockReset();
  });

  it('blocks advancing with an invalid first step and preserves answers on Back', () => {
    renderWizard();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/at least 3 characters/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/destination name/i), { target: { value: 'Tambobong' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByLabelText(/what makes it worth visiting/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByDisplayValue('Tambobong')).toBeTruthy();
  });

  it('shows the pinned coordinates and lets the traveler request a pin move', () => {
    const { props } = renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/destination name/i), { target: { value: 'Tambobong' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/what makes it worth visiting/i), {
      target: { value: 'A quiet stretch of white sand with calm water for swimming and picnics.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('15.90830, 119.78920')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /move pin/i }));
    expect(props.onRequestMovePin).toHaveBeenCalledTimes(1);
  });

  it('publishes once, follows server success and reports the created spot', async () => {
    apiMock.post.mockResolvedValue({
      data: { success: true, data: { id: 'spot-new-1', name: 'Tambobong White Beach', gps_lat: pin.lat, gps_lng: pin.lng } },
    });
    const { props } = renderWizard();
    await advanceToReview();

    const publish = screen.getByRole('button', { name: /publish destination/i });
    fireEvent.click(publish);
    fireEvent.click(publish);

    await screen.findByText(/destination published/i);
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    const [url, payload] = apiMock.post.mock.calls[0];
    expect(url).toBe('/spots');
    expect(payload).toMatchObject({
      name: 'Tambobong White Beach',
      gps_lat: pin.lat,
      gps_lng: pin.lng,
      tags: [],
      hours: {},
    });
    expect(invalidateCacheMock).toHaveBeenCalledWith('spots');
    expect(props.onPublished).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'spot-new-1' })
    );
    expect(screen.getByRole('link', { name: /view destination/i }).getAttribute('href')).toBe('/spots/spot-new-1');
  });

  it('keeps the draft when publishing fails and succeeds on retry', async () => {
    apiMock.post
      .mockRejectedValueOnce({
        response: { data: { error: { message: 'Destination temporarily unavailable. Please try again.' } } },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { id: 'spot-new-2', name: 'Tambobong White Beach', gps_lat: pin.lat, gps_lng: pin.lng } },
      });
    renderWizard();
    await advanceToReview();

    fireEvent.click(screen.getByRole('button', { name: /publish destination/i }));
    await screen.findByRole('alert');
    expect(screen.getByText(/destination temporarily unavailable/i)).toBeTruthy();
    expect(screen.getByText('Tambobong White Beach')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /publish destination/i }));
    await screen.findByText(/destination published/i);
    expect(apiMock.post).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape while keeping publish blocked during submission', async () => {
    const { props } = renderWizard();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);

    apiMock.post.mockImplementation(() => new Promise(() => {}));
    await advanceToReview();
    fireEvent.click(screen.getByRole('button', { name: /publish destination/i }));
    const closeButton = screen.getByRole('button', { name: /close posting wizard/i });
    expect(closeButton.hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
