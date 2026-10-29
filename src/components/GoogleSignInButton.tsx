'use client';

import React from 'react';

/**
 * Plan 67 "Continue with Google".
 *
 * - With a Google OAuth client ID from `GET /auth/wallet/config`, renders the official
 *   Google Identity Services button; Google hands back an ID token the API verifies.
 * - On local previews the API may instead accept `dev_google:<email>:<name>` test
 *   credentials, so the button opens a small test form (never in production builds).
 * - With neither, renders nothing.
 */

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void; ux_mode?: string }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

const GSI_SRC = 'https://accounts.google.com/gsi/client';

const loadGoogleIdentity = () => new Promise<GoogleIdentity>((resolve, reject) => {
  const existing = (window as unknown as { google?: GoogleIdentity }).google;
  if (existing?.accounts?.id) return resolve(existing);
  const script = document.createElement('script');
  script.src = GSI_SRC;
  script.async = true;
  script.onload = () => {
    const google = (window as unknown as { google?: GoogleIdentity }).google;
    if (google?.accounts?.id) resolve(google); else reject(new Error('Google sign-in did not load.'));
  };
  script.onerror = () => reject(new Error('Google sign-in did not load.'));
  document.head.appendChild(script);
});

export function GoogleSignInButton({
  clientId,
  devCredentials,
  label = 'Continue with Google',
  disabled,
  onCredential,
}: {
  clientId: string | null;
  devCredentials: boolean;
  label?: string;
  disabled?: boolean;
  onCredential: (credential: string) => void;
}) {
  const slot = React.useRef<HTMLDivElement>(null);
  const callback = React.useRef(onCredential);
  const [loadError, setLoadError] = React.useState('');
  const [devOpen, setDevOpen] = React.useState(false);
  const [devEmail, setDevEmail] = React.useState('');
  const [devName, setDevName] = React.useState('');

  React.useEffect(() => { callback.current = onCredential; }, [onCredential]);

  React.useEffect(() => {
    if (!clientId || !slot.current) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !slot.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => { if (response.credential) callback.current(response.credential); },
        });
        google.accounts.id.renderButton(slot.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 320 });
      })
      .catch((err: Error) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (clientId) {
    return (
      <div className="space-y-1">
        <div ref={slot} className="flex min-h-[44px] justify-center" aria-label={label} />
        {loadError && <p className="text-center text-xs text-red-600">{loadError}</p>}
      </div>
    );
  }

  if (!devCredentials || process.env.NODE_ENV === 'production') return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setDevOpen((open) => !open)}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-extrabold text-neutral-800 shadow-xs hover:bg-neutral-50 disabled:opacity-60"
      >
        <span aria-hidden="true" className="font-black text-[#4285F4]">G</span>
        <span>{label}</span>
      </button>
      {devOpen && (
        <form
          className="space-y-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            onCredential(`dev_google:${devEmail.trim()}:${devName.trim()}`);
          }}
        >
          <p className="text-[11px] font-bold text-amber-900">Preview only: pretend Google account</p>
          <label className="block text-xs font-bold text-neutral-700">
            Google email
            <input type="email" required value={devEmail} onChange={(e) => setDevEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-bold text-neutral-700">
            Google name
            <input type="text" value={devName} onChange={(e) => setDevName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={disabled} className="w-full rounded-lg bg-neutral-900 py-2 text-xs font-bold text-white">Use this Google account</button>
        </form>
      )}
    </div>
  );
}

export default GoogleSignInButton;
