import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectWalletPromptModal, walletConnectHref } from './ConnectWalletPromptModal';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('ConnectWalletPromptModal (Plan 67)', () => {
  it('renders nothing while closed', () => {
    const { container } = render(<ConnectWalletPromptModal open={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('names the item and sends the traveler to /wallet/connect with a return path', () => {
    const onClose = vi.fn();
    render(<ConnectWalletPromptModal open onClose={onClose} itemTitle="Bolinao coffee" returnPath="/shop?tab=vouchers" />);
    expect(screen.getByRole('dialog', { name: 'Connect a wallet to continue' }).textContent).toContain('Bolinao coffee');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, connect wallet →' }));
    expect(push).toHaveBeenCalledWith('/wallet/connect?returnTo=%2Fshop%3Ftab%3Dvouchers');
    fireEvent.click(screen.getByRole('button', { name: 'Not now, keep browsing' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('builds the connect link', () => {
    expect(walletConnectHref()).toBe('/wallet/connect?returnTo=%2Fshop');
  });
});
