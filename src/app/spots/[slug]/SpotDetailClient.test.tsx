import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SpotDetailClient } from './SpotDetailClient';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
const authState = vi.hoisted(() => ({ user: null as null | { id: string } }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a> }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: authState.user }) }));
vi.mock('@/lib/api', () => ({
  api: apiMock,
  normalizeSpot: (spot: unknown) => spot,
  isVideoMedia: () => false,
  createAuthorQuest: vi.fn(),
  toggleSpotLike: vi.fn().mockResolvedValue({ liked: true }),
  getLocalLikedSpots: () => ({}),
}));
vi.mock('@/lib/cache', () => ({ fetchWithCache: async (_key: string, fetcher: () => Promise<unknown>) => ({ data: await fetcher() }) }));
vi.mock('@/components/Navigation', () => ({ Navigation: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock('@/components/MiniMapPreview', () => ({ MiniMapPreview: () => <div /> }));
vi.mock('@/components/DestinationMedia', () => ({ DestinationMedia: () => <div /> }));
vi.mock('@/components/SpotCommentSection', () => ({ SpotCommentSection: () => <div /> }));
vi.mock('@/components/Skeleton', () => ({ SpotDetailSkeleton: () => <div>Loading</div> }));

const spot = {
  id: 'spot-1',
  slug: 'spot-1',
  name: 'Test Beach',
  municipality: 'Bolinao',
  subcategory: 'beach',
  category: 'nature',
  description: 'A real destination for the save-button test.',
  address: 'Bolinao',
  sourceName: 'Traveler',
  gpsLat: 16.3,
  gpsLng: 119.8,
  photos: [],
  imageUrl: null,
  liked: false,
  saved: false,
};

describe('SpotDetailClient saved-place action', () => {
  beforeEach(() => {
    window.localStorage.clear();
    authState.user = null;
    apiMock.get.mockReset().mockImplementation((url: string) => Promise.resolve({ data: { data: url.endsWith('/alternatives') ? [] : spot } }));
    apiMock.post.mockReset().mockResolvedValue({ data: { success: true } });
    apiMock.put.mockReset().mockResolvedValue({ data: { success: true } });
    apiMock.delete.mockReset().mockResolvedValue({ data: { success: true } });
  });

  it('saves, restores, and unsaves the destination through the shared browser library', async () => {
    const first = render(<SpotDetailClient slug="spot-1" />);
    const saveButton = await screen.findByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' }).getAttribute('aria-pressed')).toBe('true'));
    expect(JSON.parse(window.localStorage.getItem('jdq_saved_library_v1') || '{}').spots).toEqual(['spot-1']);
    expect(apiMock.post).not.toHaveBeenCalledWith('/spots/spot-1/interactions', { type: 'save' });

    first.unmount();
    render(<SpotDetailClient slug="spot-1" />);
    const savedButton = await screen.findByRole('button', { name: 'Saved' });
    fireEvent.click(savedButton);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' }).getAttribute('aria-pressed')).toBe('false'));
    expect(JSON.parse(window.localStorage.getItem('jdq_saved_library_v1') || '{}').spots).toEqual([]);
  });

  it('uses the supported save and unsave endpoints for signed-in travelers', async () => {
    authState.user = { id: 'traveler-1' };
    render(<SpotDetailClient slug="spot-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/spots/spot-1/save'));
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/spots/spot-1/save'));
    expect(apiMock.post).not.toHaveBeenCalledWith('/spots/spot-1/interactions', { type: 'save' });
  });
});
