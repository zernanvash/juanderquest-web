import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AffiliateClient } from './AffiliateClient';

vi.mock('@/components/Navigation', () => ({
  Navigation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="nav-wrapper">{children}</div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { displayName: 'Maria Santos', email: 'maria@example.com' },
    wallet: null,
    token: null,
    logout: vi.fn(),
  }),
}));

vi.mock('@/components/CelebrationEffects', () => ({
  triggerCelebration: vi.fn(),
}));

describe('AffiliateClient Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Coming Soon badge and Merchant Affiliate Hub title', () => {
    render(<AffiliateClient />);

    const heading = screen.getByRole('heading', { level: 1, name: /Merchant Affiliate Hub/i });
    expect(heading).toBeDefined();

    const comingSoonBadge = screen.getByText(/Coming Soon • Merchant Portal/i);
    expect(comingSoonBadge).toBeDefined();

    const openBadge = screen.getByText(/Applications Open/i);
    expect(openBadge).toBeDefined();

    const formHeading = screen.getByRole('heading', { name: /Apply for Merchant Affiliate Accreditation/i });
    expect(formHeading).toBeDefined();
  });

  it('allows filling out and submitting the affiliate application', () => {
    render(<AffiliateClient />);

    // Fill in required fields
    const bizInput = screen.getByPlaceholderText(/Alaminos Bangus Grill/i);
    fireEvent.change(bizInput, { target: { value: 'Bolinao Seafood Shack' } });

    const phoneInput = screen.getByPlaceholderText(/0917-123-4567/i);
    fireEvent.change(phoneInput, { target: { value: '0918-987-6543' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Submit Merchant Application/i });
    fireEvent.click(submitBtn);

    // Verify application status card is displayed
    const submittedName = screen.getByRole('heading', { name: /Bolinao Seafood Shack/i });
    expect(submittedName).toBeDefined();

    const underReview = screen.getByText(/Application Under Review/i);
    expect(underReview).toBeDefined();

    const trackingCode = screen.getByText(/Reference Tracking Code/i);
    expect(trackingCode).toBeDefined();

    // Verify localStorage has persisted data
    const saved = localStorage.getItem('jdq_merchant_application_v1');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.businessName).toBe('Bolinao Seafood Shack');
  });

  it('toggles FAQ answers on click', () => {
    render(<AffiliateClient />);

    const faqQuestion = screen.getByText(/Who can apply to become an affiliate merchant\?/i);
    fireEvent.click(faqQuestion);

    const faqAnswer = screen.getByText(/Any legally operating food establishment, resort/i);
    expect(faqAnswer).toBeDefined();
  });
});
