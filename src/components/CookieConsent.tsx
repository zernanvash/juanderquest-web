'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export const CONSENT_KEY = 'jdq_cookie_consent_v1';
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(localStorage.getItem(CONSENT_KEY) === null), []);
  const choose = (value: 'essential' | 'analytics') => {
    localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new Event('jdq-consent-changed'));
    setVisible(false);
  };
  if (!visible) return null;
  return (
    <section
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-20 left-3 right-3 z-[70] rounded-xl border border-[#D5C4AC] bg-white p-3 shadow-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:w-80"
    >
      <p className="text-xs font-black text-[#582F0E]">Your privacy, your choice</p>
      <p className="mt-1 text-[11px] leading-5 text-[#514532]">
        Essential storage keeps the app working. Optional anonymous usage events help the tourism team improve it.{' '}
        <Link href="/privacy" className="font-bold underline">Privacy policy</Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => choose('essential')}
          className="flex-1 rounded-lg border border-[#2D6A4F] px-3 py-1.5 text-[11px] font-bold text-[#2D6A4F]"
        >
          Essential only
        </button>
        <button
          onClick={() => choose('analytics')}
          className="flex-1 rounded-lg bg-[#2D6A4F] px-3 py-1.5 text-[11px] font-bold text-white"
        >
          Allow analytics
        </button>
      </div>
    </section>
  );
}
