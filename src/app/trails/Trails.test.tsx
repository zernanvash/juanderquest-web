import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrailsClient } from './TrailsClient';

const mocks = vi.hoisted(() => ({ fetchTrails: vi.fn(), unlockTrail: vi.fn(), createPersonalTrail: vi.fn(), refreshProfile: vi.fn(), searchTab: null as string | null }));
vi.mock('@/lib/trails-api', () => mocks);
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'traveler', points: 50 }, isLoading: false, refreshProfile: mocks.refreshProfile }) }));
vi.mock('@/components/Navigation', () => ({ Navigation: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => ({ get: (key: string) => key === 'tab' ? mocks.searchTab : null }) }));

const catalog = [
  { id:'locked-route',slug:'locked-route',title:'Hidden Coast',tagline:'A secret route',tier:'signature',theme:'coast',municipalities:['Bolinao'],stop_count:3,total_minutes:210,total_km:22,unlock_rule:{type:'points',price_points:300},available_until:null,rarity_art_key:'signature',is_unlocked:false },
  { id:'open-route',slug:'open-route',title:'My Open Route',tagline:'Already available',tier:'starter',theme:'heritage',municipalities:['Dagupan'],stop_count:2,total_minutes:120,total_km:8,unlock_rule:{type:'free'},available_until:null,rarity_art_key:'starter',is_unlocked:true },
];

describe('Trail hub', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.searchTab=null; mocks.fetchTrails.mockResolvedValue({items:catalog,personalGeneration:{free_remaining:1,price_points:100}}); mocks.refreshProfile.mockResolvedValue(undefined); mocks.createPersonalTrail.mockResolvedValue({ trail:{id:'personal-route'} }); });

  it('renders tier cards and keeps locked stops as mystery-only content', async () => {
    render(<TrailsClient />);
    expect(await screen.findByRole('heading', { name:'Hidden Coast' })).toBeTruthy();
    expect(screen.getByText('Mystery stops')).toBeTruthy();
    expect(screen.getByRole('link', { name:/Open trail/ }).getAttribute('href')).toBe('/trails/open-route');
    expect(JSON.stringify(document.body.textContent)).not.toContain('secret-spot-id');
  });

  it('handles unlock and reports insufficient points without leaking route data', async () => {
    mocks.unlockTrail.mockRejectedValue({ response:{ data:{ error:{ code:'INSUFFICIENT_POINTS' } } } });
    render(<TrailsClient />);
    fireEvent.click(await screen.findByRole('button', { name:/Unlock · 300 points/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Not enough points/);
    expect(mocks.unlockTrail).toHaveBeenCalledWith('locked-route');
  });

  it('validates generator preferences before calling the API and submits selected preferences', async () => {
    render(<TrailsClient />);
    fireEvent.click(await screen.findByRole('tab', { name:'Create your trail' }));
    fireEvent.click(screen.getByRole('button', { name:/Generate trail/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Describe your trip or choose/);
    fireEvent.click(screen.getByRole('button', { name:'beach' }));
    fireEvent.click(screen.getByRole('button', { name:/Generate trail/ }));
    await waitFor(() => expect(mocks.createPersonalTrail).toHaveBeenCalledWith(expect.objectContaining({ themes:['beach'], budget_min:240, pace:'balanced' })));
  });

  it('hides traveler generation and sends the legacy create deep link to Discover when disabled', async () => {
    mocks.searchTab = 'create';
    mocks.fetchTrails.mockResolvedValue({items:[],personalGeneration:null});
    render(<TrailsClient />);
    expect(await screen.findByRole('heading', { name:'Take the scenic way.' })).toBeTruthy();
    expect(screen.getByText('Unlock curated routes and check in at real places.')).toBeTruthy();
    expect(screen.queryByRole('tab', { name:'Create your trail' })).toBeNull();
    expect(screen.queryByText('Personal route builder')).toBeNull();
    expect(screen.getByRole('tab', { name:'Discover' }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('tab', { name:'My trails' }));
    expect(await screen.findByRole('heading', { name:'No saved trails yet.' })).toBeTruthy();
    expect(screen.getByText('Unlock a curated route from Discover and it will be saved here.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name:'Discover trails' }));
    expect(screen.getByRole('tab', { name:'Discover' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('button', { name:'Create your trail' })).toBeNull();
  });
});
