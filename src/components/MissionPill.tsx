import React from 'react';

/** Plan 71: the small "Daily Mission" hint shown beside a highlighted target. */
export function MissionPill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span role="status" className={`mission-guidance-pill ${className}`}>
      <span aria-hidden="true">🎯</span>
      <span>{children}</span>
    </span>
  );
}
