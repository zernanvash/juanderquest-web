import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QrPanel } from './methods/QrPanel';
import { QrSheet } from './QrSheet';
import type { QrCfg } from './types';

vi.mock('@/components/MiniMapPreview', () => ({ MiniMapPreview: () => <div>map</div> }));
afterEach(cleanup);

const fence = { lat: 16.3, lng: 119.8, radius_meters: 80 };

describe('QR task scan mode', () => {
  it('lets the creator choose who scans, defaulting to the traveler', () => {
    const onChange = vi.fn();
    const config: QrCfg = { type: 'qr', fence };
    const view = render(<QrPanel config={config} destinationCoords={{ lat: 16.3, lng: 119.8 }} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Traveler scans a code/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/Secret QR Code/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /I scan the traveler/ }));
    expect(onChange).toHaveBeenLastCalledWith({ ...config, scan_mode: 'host_scans_traveler' });

    view.rerender(<QrPanel config={{ ...config, scan_mode: 'host_scans_traveler' }} destinationCoords={{ lat: 16.3, lng: 119.8 }} onChange={onChange} />);
    expect(screen.getByText(/Host scan:/)).toBeTruthy();
    expect(screen.getByText('Where you scan travelers')).toBeTruthy();
  });

  it('prints placards only for traveler-scanned tasks', () => {
    render(<QrSheet data={{
      quest_id: 'q1', quest_title: 'Quest', location_name: 'Bolinao',
      qr_tasks: [
        { task_key: 'a', step_order: 1, title: 'Gate placard', marker_code: 'M1', qr_payload: 'M1', scan_mode: 'traveler_scans' },
        { task_key: 'b', step_order: 2, title: 'Host check-in', marker_code: 'M2', qr_payload: 'M2', scan_mode: 'host_scans_traveler' },
      ],
    }} />);
    expect(screen.getByTestId('qr-placard-1')).toBeTruthy();
    expect(screen.queryByTestId('qr-placard-2')).toBeNull();
    expect(screen.getByTestId('host-scan-note').textContent).toContain('2. Host check-in');
  });
});
