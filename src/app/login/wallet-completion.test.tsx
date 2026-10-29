import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

// Plan 67: a wallet without an email + password account finishes the account on /login.
const push = vi.fn();
const completeWalletRegistration = vi.fn(async () => ({ success: true }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(async () => ({ data: { data: { mode: 'local', google_client_id: null, google_dev_credentials: false } } })), post: vi.fn() },
}));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: null, isLoading: false,
    loginWithEmail: vi.fn(), registerWithEmail: vi.fn(), verifyEmailOtp: vi.fn(),
    loginWithWallet: vi.fn(), loginWithGoogle: vi.fn(), completeWalletRegistration,
  }),
  shouldStayInTravelerApp: () => false,
}));
vi.mock('@/components/DevWalletLogin', () => ({
  DevWalletLogin: ({ onFinish }: { onFinish: (r: unknown) => void }) => (
    <button type="button" onClick={() => onFinish({
      status: 'requires_account_completion', walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      grant: 'grant-1', existingDisplayName: 'Old Scout',
    })}>Fake wallet</button>
  ),
}));

describe('wallet account completion on /login', () => {
  it('asks for email + password after a new wallet connects, then signs in', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Fake wallet' }));

    expect(await screen.findByRole('heading', { name: 'Complete your account' })).toBeTruthy();
    expect(screen.getByText('0x71C7…976F')).toBeTruthy();
    expect((screen.getByLabelText('Display Name') as HTMLInputElement).value).toBe('Old Scout');
    expect(screen.queryByRole('button', { name: 'Sign In' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'scout@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ScoutPass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finish & Continue' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/age requirement/);
    expect(completeWalletRegistration).not.toHaveBeenCalled();

    for (const box of screen.getAllByRole('checkbox').slice(0, 2)) fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: 'Finish & Continue' }));
    await waitFor(() => expect(completeWalletRegistration).toHaveBeenCalledWith(expect.objectContaining({
      grant: 'grant-1', walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      email: 'scout@example.com', password: 'ScoutPass123', displayName: 'Old Scout',
      ageEligibilityDeclared: true, termsAccepted: true,
    })));
    expect(push).toHaveBeenCalled();
  });
});
