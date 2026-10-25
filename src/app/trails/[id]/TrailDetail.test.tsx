import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrailDetailClient } from './TrailDetailClient';

const mocks = vi.hoisted(() => ({ fetchTrail: vi.fn(), unlockTrail: vi.fn(), checkInTrailStop: vi.fn(), refreshProfile: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/trails-api', () => mocks);
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id:'traveler', points:500 }, refreshProfile:mocks.refreshProfile }) }));
vi.mock('@/components/Navigation', () => ({ Navigation: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/trails/TrailRouteMap', () => ({ TrailRouteMap: () => <div data-testid="route-map"/> }));
vi.mock('@/components/CelebrationEffects', () => ({ triggerCelebration: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id:'route-a' }), useSearchParams: () => new URLSearchParams(''), useRouter: () => ({ push:mocks.push }) }));

const locked = { id:'route-a',slug:'route-a',title:'Locked Coast',tagline:'Private trip',tier:'signature',theme:'beach',municipalities:['Bolinao'],stop_count:2,total_minutes:180,total_km:14,unlock_rule:{type:'points',price_points:300},available_until:null,rarity_art_key:'signature',is_unlocked:false };
const unlocked = { ...locked, is_unlocked:true, story:{intro:'A gentle coast route.'}, stops:[{position:1,spot_id:'spot-secret-1',name:'Patar Beach',municipality:'Bolinao',category:'beach',lat:16.32,lng:119.78,narration:'The local story.',arrive_offset_min:0,dwell_min:30,leg_minutes:0,leg_km:0,checkin_radius_m:100,checked_in:false}] };

describe('Trail detail privacy and progress', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.refreshProfile.mockResolvedValue(undefined); });

  it('does not render stop identifiers, coordinates, narration, or route map while locked', async () => {
    mocks.fetchTrail.mockResolvedValue(locked);
    render(<TrailDetailClient/>);
    expect(await screen.findByRole('heading',{name:'A route of 2 mystery stops'})).toBeTruthy();
    expect(screen.queryByTestId('route-map')).toBeNull();
    expect(document.body.textContent).not.toContain('spot-secret-1');
    expect(document.body.textContent).not.toContain('16.32');
    expect(document.body.textContent).not.toContain('The local story.');
  });

  it('offers authenticated unlock and surfaces idempotent API failure truthfully', async () => {
    mocks.fetchTrail.mockResolvedValue(locked);
    mocks.unlockTrail.mockRejectedValue({ response:{data:{error:{code:'RULE_NOT_MET'}}} });
    render(<TrailDetailClient/>);
    fireEvent.click((await screen.findAllByRole('button',{name:/Unlock · 300 points/}))[0]);
    expect((await screen.findByRole('alert')).textContent).toMatch(/does not meet/);
    expect(mocks.unlockTrail).toHaveBeenCalledWith('route-a');
  });

  it('renders unlocked map and records a stop check-in', async () => {
    mocks.fetchTrail.mockResolvedValue(unlocked);
    mocks.checkInTrailStop.mockResolvedValue({progress:[],completion:null});
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition: (success: PositionCallback) => success({coords:{latitude:16.32,longitude:119.78,accuracy:8} as GeolocationCoordinates} as GeolocationPosition)}});
    try {
      render(<TrailDetailClient/>);
      expect(await screen.findByTestId('route-map')).toBeTruthy();
      fireEvent.click(screen.getByRole('button',{name:'Check in'}));
      await waitFor(() => expect(mocks.checkInTrailStop).toHaveBeenCalledWith('route-a',1,{lat:16.32,lng:119.78,accuracy_m:8}));
    } finally { Object.defineProperty(navigator,'geolocation',{configurable:true,value:originalGeolocation}); }
  });
});
