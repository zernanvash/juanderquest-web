import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Navigation } from './Navigation';

// Mock next/navigation
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
};

let currentPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => mockRouter,
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'traveler-1',
      displayName: 'Vash',
      handle: '@vash',
      points: 120,
      role: 'traveler',
    },
    logout: vi.fn(),
    loginWithSignature: vi.fn(),
    loginDemo: vi.fn(),
    guestLogin: vi.fn(),
  }),
  adminHandoffUrl: () => 'https://admin.juanderquest.app',
}));

// Mock API
vi.mock('@/lib/api', () => ({
  fetchMerchantMe: vi.fn().mockResolvedValue({ has_merchant: false }),
}));

const notificationsApi = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/notifications-api', () => notificationsApi);


describe('Navigation Red Notification Indicators', () => {
  beforeEach(() => {
    localStorage.clear();
    currentPathname = '/dashboard';
    vi.clearAllMocks();
    notificationsApi.getNotifications.mockResolvedValue([{
      id: '00000000-0000-4000-8000-000000000001', kind: 'quest_funding', title: 'Quest funding ready',
      message: 'This quest is funded and accepting travelers.', href: '/quests/test-quest',
      created_at: '2026-10-17T00:00:00.000Z', read: false,
    }]);
  });

  it('loads durable funding alerts for the signed-in traveler and marks the selected alert read', async () => {
    render(<Navigation><div>Content</div></Navigation>);
    fireEvent.click(screen.getAllByLabelText('Notifications and Activity')[0]);
    const alerts = await screen.findAllByText('Quest funding ready');
    const alert = alerts[0];
    expect(alerts.length).toBeGreaterThan(0);
    fireEvent.click(alert.closest('a')!);
    expect(notificationsApi.markNotificationRead).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001');
  });

  it('does not render any global search bar, input, button, or shortcut trigger', () => {
    render(<Navigation><div>Content</div></Navigation>);
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
    expect(screen.queryByLabelText(/search/i)).toBeNull();
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('renders red notification indicators on desktop sidebar for pages with news (Quests and JuanChoice)', async () => {
    render(<Navigation><div>Content</div></Navigation>);

    // On expanded desktop sidebar, Quests and JuanChoice should have red notif indicators
    const questsIndicator = screen.getByTestId('notif-indicator-quests');
    expect(questsIndicator).toBeTruthy();
    expect(questsIndicator.getAttribute('aria-label')).toBe('New updates available');

    const choiceIndicator = screen.getByTestId('notif-indicator-choice');
    expect(choiceIndicator).toBeTruthy();
    expect(choiceIndicator.getAttribute('aria-label')).toBe('New updates available');

    // Home should NOT have notif indicator because active route is /dashboard
    expect(screen.queryByTestId('notif-indicator-dashboard')).toBeNull();
  });

  it('renders red notification indicators inside mobile drawer for pages with news', async () => {
    render(
      <Navigation sidePanel={<div>Highlights Panel</div>} sidePanelTitle="Explorer Highlights">
        <div>Content</div>
      </Navigation>
    );

    // Open mobile drawer
    const openDrawerBtn = screen.getByLabelText('Open navigation menu');
    fireEvent.click(openDrawerBtn);

    // Mobile drawer should display red indicators for Quests and JuanChoice
    const drawerQuestsIndicator = screen.getByTestId('drawer-notif-indicator-quests');
    expect(drawerQuestsIndicator).toBeTruthy();

    const drawerChoiceIndicator = screen.getByTestId('drawer-notif-indicator-choice');
    expect(drawerChoiceIndicator).toBeTruthy();

    // SidePanel highlights button inside drawer should have unvisited indicator
    const sidePanelIndicator = screen.getByTestId('sidepanel-drawer-notif-indicator');
    expect(sidePanelIndicator).toBeTruthy();
    expect(sidePanelIndicator.getAttribute('aria-label')).toBe('New highlights');
  });

  it('renders red notification indicator on mobile bottom bar for Quests tab', () => {
    render(<Navigation><div>Content</div></Navigation>);

    const bottomQuestsIndicator = screen.getByTestId('bottom-notif-indicator-quests');
    expect(bottomQuestsIndicator).toBeTruthy();
  });

  it('clears page notification indicator when active pathname matches the route', async () => {
    currentPathname = '/quests';
    render(<Navigation><div>Content</div></Navigation>);

    // Since currentPathname is /quests, the indicator for quests should be cleared
    expect(screen.queryByTestId('notif-indicator-quests')).toBeNull();
    expect(screen.queryByTestId('drawer-notif-indicator-quests')).toBeNull();

    // JuanChoice is not the active route, so it should still have its indicator
    expect(screen.getByTestId('notif-indicator-choice')).toBeTruthy();
  });

  it('clears all notification indicators when Mark All Read is clicked', async () => {
    render(<Navigation><div>Content</div></Navigation>);

    // Open Activity dropdown on desktop sidebar
    const activityBtn = screen.getByLabelText('Notifications and Activity');
    fireEvent.click(activityBtn);

    // Click "Mark all read"
    const markAllReadBtns = screen.getAllByText('Mark all read');
    fireEvent.click(markAllReadBtns[0]);

    // All red indicators should now be cleared
    await waitFor(() => {
      expect(screen.queryByTestId('notif-indicator-quests')).toBeNull();
      expect(screen.queryByTestId('notif-indicator-choice')).toBeNull();
      expect(screen.queryByTestId('bottom-notif-indicator-quests')).toBeNull();
    });
  });

  it('clears sidepanel drawer indicator when sidepanel button is opened', async () => {
    render(
      <Navigation sidePanel={<div>Highlights Panel</div>} sidePanelTitle="Explorer Highlights">
        <div>Content</div>
      </Navigation>
    );

    // Open mobile drawer
    fireEvent.click(screen.getByLabelText('Open navigation menu'));
    expect(screen.getByTestId('sidepanel-drawer-notif-indicator')).toBeTruthy();

    // Click Explorer Highlights button
    const highlightsBtn = screen.getByRole('button', { name: /explorer highlights/i });
    fireEvent.click(highlightsBtn);

    // Reopen drawer
    fireEvent.click(screen.getByLabelText('Open navigation menu'));

    // Sidepanel indicator should now be cleared as visited
    expect(screen.queryByTestId('sidepanel-drawer-notif-indicator')).toBeNull();
  });
});
