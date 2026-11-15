import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArPanel } from './methods/ArPanel';
import type { ArCfg } from './types';

vi.mock('@/components/MiniMapPreview', () => ({ MiniMapPreview: () => <div>map</div> }));
afterEach(cleanup);

const fence = { lat: 16.3, lng: 119.8, radius_meters: 60 };

// Plan 77: the web builder keeps an AR task's game; the games are played in the app.
describe('AR task game', () => {
  it('picks a game, keeping the fence and object, and hides the object picker', () => {
    const onChange = vi.fn();
    const config: ArCfg = { type: 'ar', fence, object: 'gem', color: '#2D6A4F' };
    const view = render(<ArPanel config={config} destinationCoords={{ lat: 16.3, lng: 119.8 }} onChange={onChange} />);
    expect(screen.getByText('3D Virtual Object')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Game'), { target: { value: 'pana' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...config, game: 'pana' });

    view.rerender(<ArPanel config={{ ...config, game: 'pana' }} destinationCoords={{ lat: 16.3, lng: 119.8 }} onChange={onChange} />);
    expect(screen.queryByText('3D Virtual Object')).toBeNull();
    expect((screen.getByLabelText('Game') as HTMLSelectElement).value).toBe('pana');
  });

  it('keeps the game when the fence is reset', () => {
    const onChange = vi.fn();
    const config: ArCfg = { type: 'ar', fence, object: 'token', color: '#FFB703', game: 'sipa' };
    render(<ArPanel config={config} destinationCoords={{ lat: 16.4, lng: 119.9 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Reset to center/ }));
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ game: 'sipa', fence: { lat: 16.4, lng: 119.9, radius_meters: 50 } });
  });
});
