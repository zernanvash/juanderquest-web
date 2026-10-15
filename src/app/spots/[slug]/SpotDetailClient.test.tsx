import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  isVideoMedia: (url: unknown) => typeof url === 'string' && /\.(mp4|webm)$/i.test(url),
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

  it('shows Commons photo attribution and does not invent opening hours for open data', async () => {
    apiMock.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url.endsWith('/alternatives') ? [] : {
      ...spot,
      sourceName: 'Photo: BiancaBrazal · CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hundred_Islands.jpg',
      trustLevel: 'open_data',
      hours: {},
    } } }));

    render(<SpotDetailClient slug="spot-1" />);

    const attribution = await screen.findByRole('link', { name: 'BiancaBrazal · CC BY-SA 4.0' });
    expect(attribution.getAttribute('href')).toBe('https://commons.wikimedia.org/wiki/File:Hundred_Islands.jpg');
    expect(screen.getByText('Hours not confirmed')).toBeTruthy();
    expect(screen.getByText('Open-data source; not LGU-verified')).toBeTruthy();
  });

  it('keeps a single hero h1, truthful location and the branded fallback when no photo exists', async () => {
    render(<SpotDetailClient slug="spot-1" />);

    const heading = await screen.findByRole('heading', { level: 1, name: 'Test Beach' });
    expect(heading).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByText('Bolinao, Pangasinan')).toBeNull();

    const stage = screen.getByRole('region', { name: /cinematic showcase for test beach/i });
    const backdrop = stage.querySelector('img');
    expect(backdrop?.getAttribute('src')).toContain('bg_landscape.png');
    expect(backdrop?.getAttribute('loading')).toBe('eager');

    expect(screen.getByRole('button', { name: /scroll to explore the destination story/i })).toBeTruthy();
    expect(document.getElementById('spot-info')).toBeTruthy();

    const continueReading = screen.getByRole('link', { name: /continue reading/i });
    expect(continueReading.getAttribute('href')).toBe('#spot-about');
    expect(document.getElementById('spot-about')).toBeTruthy();
  });

  it('shows a poster still and an explicit play action for a video lead instead of autoplaying', async () => {
    apiMock.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url.endsWith('/alternatives') ? [] : {
      ...spot,
      imageUrl: 'https://cdn.example/clip.mp4',
      photos: ['https://cdn.example/clip.mp4'],
    } } }));

    render(<SpotDetailClient slug="spot-1" />);

    const play = await screen.findByRole('button', { name: /play destination video in gallery/i });
    expect(document.querySelector('video')).toBeNull();

    const stage = screen.getByRole('region', { name: /cinematic showcase for test beach/i });
    const backdrop = stage.querySelector('img');
    expect(backdrop?.getAttribute('src')).toContain('bg_landscape.png');

    fireEvent.click(play);
    await waitFor(() => expect(document.querySelector('video')).not.toBeNull());
    expect(screen.getByRole('button', { name: /close fullscreen view/i })).toBeTruthy();
  });

  it('makes the bottom gradient reactive to mouse detection and pointer movement', async () => {
    render(<SpotDetailClient slug="spot-1" />);

    const stage = await screen.findByRole('region', { name: /cinematic showcase for test beach/i });
    const reactiveGradient = screen.getByTestId('spot-reactive-bottom-gradient');

    // Initially hidden
    expect(reactiveGradient.className).toContain('opacity-0');
    expect(reactiveGradient.className).toContain('translate-y-3');

    // Mouse enters stage
    act(() => {
      fireEvent.pointerEnter(stage, { pointerType: 'mouse' });
    });
    expect(reactiveGradient.className).toContain('opacity-100');
    expect(reactiveGradient.className).toContain('translate-y-0');

    // Mouse moves across stage
    act(() => {
      fireEvent.pointerMove(stage, {
        pointerType: 'mouse',
        clientX: 200,
        clientY: 300,
      });
    });
    expect(reactiveGradient.className).toContain('opacity-100');

    // Mouse leaves stage
    act(() => {
      fireEvent.pointerLeave(stage);
    });
    expect(reactiveGradient.className).toContain('opacity-0');
    expect(reactiveGradient.className).toContain('translate-y-3');
  });
});

