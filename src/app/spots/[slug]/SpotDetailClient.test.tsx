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
    expect(screen.queryByRole('heading', { level: 2, name: 'Test Beach' })).toBeNull();

    const hero = screen.getByRole('region', { name: /destination showcase for test beach/i });
    expect(hero).toBeTruthy();

    const backdrop = document.querySelector('.spot-backdrop');
    expect(backdrop?.getAttribute('src')).toContain('bg_landscape.png');
    expect(backdrop?.getAttribute('loading')).toBe('eager');

    expect(screen.getByRole('button', { name: /scroll to explore the destination story/i })).toBeTruthy();
    expect(document.getElementById('spot-info')).toBeTruthy();
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

    const backdrop = document.querySelector('.spot-backdrop');
    expect(backdrop?.getAttribute('src')).toContain('bg_landscape.png');

    fireEvent.click(play);
    await waitFor(() => expect(document.querySelector('video')).not.toBeNull());
    expect(screen.getByRole('button', { name: /close fullscreen view/i })).toBeTruthy();
  });

  it('renders one stationary backdrop photo and no floating carousel arrows', async () => {
    render(<SpotDetailClient slug="spot-1" />);

    await screen.findByRole('region', { name: /destination showcase for test beach/i });
    expect(screen.queryByTestId('spot-reactive-bottom-gradient')).toBeNull();
    expect(document.querySelectorAll('.spot-backdrop')).toHaveLength(1);

    expect(screen.queryByRole('button', { name: /^previous photo$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^next photo$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /open fullscreen photo gallery/i })).toBeTruthy();
  });

  it('safely falls back to branded landscape on image load error', async () => {
    apiMock.get.mockImplementation((url: string) => Promise.resolve({
      data: {
        data: url.endsWith('/alternatives') ? [] : {
          ...spot,
          imageUrl: 'https://images.example/spot-photo.jpg',
          photos: ['https://images.example/spot-photo.jpg'],
        },
      },
    }));

    render(<SpotDetailClient slug="spot-1" />);

    await screen.findByRole('region', { name: /destination showcase for test beach/i });
    const backdrop = document.querySelector('.spot-backdrop') as HTMLImageElement;
    expect(backdrop).not.toBeNull();
    expect(backdrop.src).toContain('https://images.example/spot-photo.jpg');

    // Trigger onError on backdrop image
    fireEvent.error(backdrop);
    expect(backdrop.src).toContain('/bg_landscape.png');
    expect(backdrop.dataset.fallbackApplied).toBe('true');
  });

  it('renders stage presence, scrubber line, and chapter navigation anchors', async () => {
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(<SpotDetailClient slug="spot-1" />);

    const hero = await screen.findByRole('region', { name: /destination showcase for test beach/i });
    expect(hero.getAttribute('data-spot-presence')).toBe('visible');

    // Scrubber line exists
    const scrubber = screen.getByRole('progressbar', { name: /story reading progress scrubber/i });
    expect(scrubber).toBeTruthy();

    // Chapter navigation bar exists
    const chaptersNav = screen.getByRole('navigation', { name: /story chapters/i });
    expect(chaptersNav).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Comments' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Venue & Map' })).toBeTruthy();

    // Stable anchor IDs exist
    expect(document.getElementById('spot-info')).toBeTruthy();
    expect(document.getElementById('spot-about')).toBeTruthy();
    expect(document.getElementById('spot-comments')).toBeTruthy();
    expect(document.getElementById('spot-venue')).toBeTruthy();

    // Clicking chapter scrolls into view
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('renders Nearby chapter when alternatives exist', async () => {
    apiMock.get.mockImplementation((url: string) => Promise.resolve({
      data: {
        data: url.endsWith('/alternatives')
          ? [{ ...spot, id: 'alt-1', name: 'Nearby Cave' }]
          : spot,
      },
    }));

    render(<SpotDetailClient slug="spot-1" />);

    await screen.findByRole('heading', { level: 1, name: 'Test Beach' });
    expect(screen.getByRole('button', { name: 'Nearby' })).toBeTruthy();
    expect(document.getElementById('spot-alternatives')).toBeTruthy();
  });

  it('renders Lightbox with presence controls and End Card on the last photo', async () => {
    apiMock.get.mockImplementation((url: string) => Promise.resolve({
      data: {
        data: url.endsWith('/alternatives') ? [] : {
          ...spot,
          questId: 'quest-123',
          imageUrl: 'https://cdn.example/photo1.jpg',
          photos: ['https://cdn.example/photo1.jpg', 'https://cdn.example/photo2.jpg'],
        },
      },
    }));

    render(<SpotDetailClient slug="spot-1" />);

    const openGallery = await screen.findByRole('button', { name: /open fullscreen photo gallery/i });
    fireEvent.click(openGallery);

    // Lightbox open with presence
    const closeBtn = screen.getByRole('button', { name: /close fullscreen view/i });
    expect(closeBtn).toBeTruthy();

    // On slide 1: Next button exists
    const nextBtn = screen.getByRole('button', { name: /next photo/i });
    fireEvent.click(nextBtn);

    // Now on slide 2 (last slide): End Card appears
    expect(screen.getByText('Story Summary')).toBeTruthy();
    expect(screen.getByRole('link', { name: /play quest/i })).toBeTruthy();
    const backToStoryBtn = screen.getByRole('button', { name: /back to story/i });
    expect(backToStoryBtn).toBeTruthy();

    // Clicking Back to Story closes lightbox
    fireEvent.click(backToStoryBtn);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /close fullscreen view/i })).toBeNull();
    });
  });
});

