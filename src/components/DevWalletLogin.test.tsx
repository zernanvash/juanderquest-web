import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DevWalletLogin } from './DevWalletLogin';

const mockAuth = {
  isLoading: false,
  loginWithLocalWallet: vi.fn(async () => true),
  loginWithSeed: vi.fn(async () => true),
};

vi.mock('@/lib/auth', () => ({
  useAuth: () => mockAuth,
}));

describe('DevWalletLogin', () => {
  beforeEach(() => {
    mockAuth.loginWithLocalWallet.mockClear();
    mockAuth.loginWithSeed.mockClear();
  });

  it('renders nothing unless the backend reports local wallet mode', () => {
    const { container } = render(<DevWalletLogin mode="signature" rememberMe onFinish={() => {}} />);
    expect(container.innerHTML).toBe('');
    const { container: none } = render(<DevWalletLogin mode={null} rememberMe onFinish={() => {}} />);
    expect(none.innerHTML).toBe('');
  });

  it('signs in with a trimmed local identifier and reports the result', async () => {
    const onFinish = vi.fn();
    render(<DevWalletLogin mode="local" rememberMe={false} onFinish={onFinish} />);
    fireEvent.change(screen.getByLabelText('Wallet address or test name'), { target: { value: '  cafe-owner  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith(true));
    expect(mockAuth.loginWithLocalWallet).toHaveBeenCalledWith('cafe-owner', false);
  });

  it('rejects an empty identifier without calling the API', async () => {
    render(<DevWalletLogin mode="local" rememberMe onFinish={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Enter a wallet address or a test name');
    expect(mockAuth.loginWithLocalWallet).not.toHaveBeenCalled();
  });

  it('offers seeded demo accounts', async () => {
    const onFinish = vi.fn();
    render(<DevWalletLogin mode="local" rememberMe onFinish={onFinish} />);
    fireEvent.click(screen.getByRole('button', { name: 'Demo admin' }));
    await waitFor(() => expect(mockAuth.loginWithSeed).toHaveBeenCalledWith('admin-1'));
  });
});
