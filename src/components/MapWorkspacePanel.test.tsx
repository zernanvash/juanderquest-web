import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapWorkspacePanel, MapWorkspaceTab } from './MapWorkspacePanel';
import { MapPin, Award } from 'lucide-react';

const mockTabs: MapWorkspaceTab[] = [
  { id: 'explore', label: 'Explore', icon: MapPin, badge: 12 },
  { id: 'details', label: 'Details', icon: Award, badge: '1' },
];

describe('MapWorkspacePanel', () => {
  it('renders title, subtitle, and badge', () => {
    render(
      <MapWorkspacePanel
        title="Test Map Workspace"
        subtitle="12 destinations found"
        badge={{ label: 'Live', variant: 'emerald' }}
        tabs={mockTabs}
        activeTab="explore"
        onTabChange={vi.fn()}
        isDesktopCollapsed={false}
        onDesktopCollapseChange={vi.fn()}
        mobileSnap="half"
        onMobileSnapChange={vi.fn()}
      >
        <div data-testid="panel-content">Workspace Content</div>
      </MapWorkspacePanel>
    );

    expect(screen.getAllByText('Test Map Workspace').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12 destinations found').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Live').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('panel-content').length).toBeGreaterThan(0);
  });

  it('triggers onTabChange when a tab button is clicked', () => {
    const handleTabChange = vi.fn();
    render(
      <MapWorkspacePanel
        title="Test Map Workspace"
        tabs={mockTabs}
        activeTab="explore"
        onTabChange={handleTabChange}
        isDesktopCollapsed={false}
        onDesktopCollapseChange={vi.fn()}
        mobileSnap="half"
        onMobileSnapChange={vi.fn()}
      >
        <div>Content</div>
      </MapWorkspacePanel>
    );

    const detailsButtons = screen.getAllByRole('tab', { name: /details/i });
    expect(detailsButtons.length).toBeGreaterThan(0);
    fireEvent.click(detailsButtons[0]);

    expect(handleTabChange).toHaveBeenCalledWith('details');
  });

  it('triggers onDesktopCollapseChange when collapse button is clicked', () => {
    const handleCollapse = vi.fn();
    render(
      <MapWorkspacePanel
        title="Test Map Workspace"
        tabs={mockTabs}
        activeTab="explore"
        onTabChange={vi.fn()}
        isDesktopCollapsed={false}
        onDesktopCollapseChange={handleCollapse}
        mobileSnap="half"
        onMobileSnapChange={vi.fn()}
      >
        <div>Content</div>
      </MapWorkspacePanel>
    );

    const collapseButton = screen.getByTitle('Collapse sidebar dock');
    fireEvent.click(collapseButton);

    expect(handleCollapse).toHaveBeenCalledWith(true);
  });

  it('shows collapsed pill on desktop and triggers expand on click', () => {
    const handleCollapse = vi.fn();
    render(
      <MapWorkspacePanel
        title="Test Map Workspace"
        subtitle="12 destinations"
        tabs={mockTabs}
        activeTab="explore"
        onTabChange={vi.fn()}
        isDesktopCollapsed={true}
        onDesktopCollapseChange={handleCollapse}
        mobileSnap="half"
        onMobileSnapChange={vi.fn()}
      >
        <div>Content</div>
      </MapWorkspacePanel>
    );

    const expandButton = screen.getByTitle('Expand Test Map Workspace');
    fireEvent.click(expandButton);

    expect(handleCollapse).toHaveBeenCalledWith(false);
  });

  it('handles mobile snap state cycling', () => {
    const handleMobileSnap = vi.fn();
    const { rerender } = render(
      <MapWorkspacePanel
        title="Test Map Workspace"
        tabs={mockTabs}
        activeTab="explore"
        onTabChange={vi.fn()}
        isDesktopCollapsed={false}
        onDesktopCollapseChange={vi.fn()}
        mobileSnap="half"
        onMobileSnapChange={handleMobileSnap}
      >
        <div>Content</div>
      </MapWorkspacePanel>
    );

    // Click expand to full height
    const expandFullBtn = screen.getByTitle('Expand to Full Height');
    fireEvent.click(expandFullBtn);
    expect(handleMobileSnap).toHaveBeenCalledWith('full');

    // Click minimize to peek bar
    const minimizePeekBtn = screen.getByTitle('Minimize to Peek Bar');
    fireEvent.click(minimizePeekBtn);
    expect(handleMobileSnap).toHaveBeenCalledWith('peek');

    // Rerender in peek mode
    rerender(
      <MapWorkspacePanel
        title="Test Map Workspace"
        tabs={mockTabs}
        activeTab="explore"
        onTabChange={vi.fn()}
        isDesktopCollapsed={false}
        onDesktopCollapseChange={vi.fn()}
        mobileSnap="peek"
        onMobileSnapChange={handleMobileSnap}
      >
        <div>Content</div>
      </MapWorkspacePanel>
    );

    const expandPeekBtn = screen.getByTitle('Expand panel');
    fireEvent.click(expandPeekBtn);
    expect(handleMobileSnap).toHaveBeenCalledWith('half');
  });

  it('renders floating map tools', () => {
    render(
      <MapWorkspacePanel
        title="Test Map Workspace"
        tabs={mockTabs}
        activeTab="explore"
        onTabChange={vi.fn()}
        isDesktopCollapsed={false}
        onDesktopCollapseChange={vi.fn()}
        mobileSnap="half"
        onMobileSnapChange={vi.fn()}
        floatingTools={<button data-testid="test-floating-tool">Tool</button>}
      >
        <div>Content</div>
      </MapWorkspacePanel>
    );

    expect(screen.getByTestId('test-floating-tool')).toBeDefined();
  });
});
