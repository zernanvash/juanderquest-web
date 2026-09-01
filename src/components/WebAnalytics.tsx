'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { CONSENT_KEY } from './CookieConsent';
function sessionId() { const key = 'jdq_analytics_session'; let id = sessionStorage.getItem(key); if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); } return id; }
function send(eventType: 'page_view' | 'cta_click', path: string, label?: string) { if (localStorage.getItem(CONSENT_KEY) !== 'analytics') return; const body = JSON.stringify({ eventType, path, label, sessionId: sessionId() }); if (!navigator.sendBeacon?.('/api/v1/analytics/events', new Blob([body], { type: 'application/json' }))) void fetch('/api/v1/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }); }
export function WebAnalytics() { const pathname = usePathname(); useEffect(() => send('page_view', pathname), [pathname]); useEffect(() => { const click = (event: MouseEvent) => { const el = (event.target as HTMLElement).closest<HTMLElement>('[data-analytics-label]'); if (el) send('cta_click', location.pathname, el.dataset.analyticsLabel); }; document.addEventListener('click', click); return () => document.removeEventListener('click', click); }, []); return null; }
