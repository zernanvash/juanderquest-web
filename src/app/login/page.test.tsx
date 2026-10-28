import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => new Promise(() => {})),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    loginWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    verifyEmailOtp: vi.fn(),
    loginWithWallet: vi.fn(),
  }),
  shouldStayInTravelerApp: () => false,
  adminHandoffUrl: () => 'https://admin.juanderquest.app',
}));

vi.mock('@/components/DevWalletLogin', () => ({
  DevWalletLogin: () => null,
}));

describe('traveler login form', () => {
  it('associates the visible labels with the email and password inputs', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email Address')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.getByLabelText('Remember this session')).toBeDefined();
  });
});
