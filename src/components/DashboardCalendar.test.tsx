import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardCalendar, PANGASINAN_EVENTS, countdownLabel, manilaDateString, projectEvents } from './DashboardCalendar';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
afterEach(cleanup);

describe('calendar dates', () => {
  it('uses the Manila date, not the browser zone', () => {
    expect(manilaDateString(new Date('2026-10-30T17:30:00Z'))).toBe('2026-10-31');
  });

  it('rolls annual events forward and drops finished one-off events', () => {
    const events = projectEvents(PANGASINAN_EVENTS, '2026-11-02');
    const bangus = events.find((ev) => ev.id === 'ev-bangus-fest-2026')!;
    expect([bangus.date, bangus.endDate]).toEqual(['2027-10-18', '2027-10-24']);
    expect(events.some((ev) => ev.id === 'ev-juanchoice-round-2')).toBe(false);
    expect(events.map((ev) => ev.date)).toEqual([...events.map((ev) => ev.date)].sort());
  });

  it('labels countdowns', () => {
    const ev = { ...PANGASINAN_EVENTS[0], date: '2026-10-31', endDate: undefined };
    expect(countdownLabel(ev, '2026-10-30')).toBe('Tomorrow');
    expect(countdownLabel(ev, '2026-10-31')).toBe('Today');
    expect(countdownLabel({ ...ev, date: '2026-11-04' }, '2026-10-30')).toBe('In 5 days');
    expect(countdownLabel({ ...ev, date: '2026-10-28', endDate: '2026-11-01' }, '2026-10-30')).toBe('Happening now');
  });
});

describe('DashboardCalendar', () => {
  it('opens on the next three events and expands to the month grid on demand', () => {
    render(<DashboardCalendar today="2026-10-30" />);
    const strip = screen.getByRole('list', { name: 'Upcoming events' });
    expect(strip.querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByText('Antong Falls Protected Watershed Eco-Trek')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Previous month' })).toBeNull();
    expect(screen.getAllByRole('link', { name: /Sison/ })[0].getAttribute('href')).toBe('/map?area=Sison');

    fireEvent.click(screen.getByRole('button', { name: 'Expand full month' }));
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Collapse calendar' }).getAttribute('aria-expanded')).toBe('true');
  });
});
