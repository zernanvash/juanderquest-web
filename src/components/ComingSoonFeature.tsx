import Link from 'next/link';
import { ArrowRight, Clock3, type LucideIcon } from 'lucide-react';

type FeatureLink = {
  href: string;
  label: string;
};

type FeatureHighlight = {
  title: string;
  description: string;
};

type ComingSoonFeatureProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: readonly FeatureHighlight[];
  availabilityNote: string;
  primaryLink: FeatureLink;
  secondaryLink?: FeatureLink;
};

/** Reusable, non-interactive preview for features that are not yet available. */
export function ComingSoonFeature({
  eyebrow,
  title,
  description,
  icon: Icon,
  highlights,
  availabilityNote,
  primaryLink,
  secondaryLink,
}: ComingSoonFeatureProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--color-brand-primary)]/5 blur-2xl" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary-light)] text-[var(--color-brand-primary)]">
              <Icon aria-hidden="true" className="h-6 w-6" />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
              Coming soon
            </span>
          </div>

          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-brand-brown)] sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">{description}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={primaryLink.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)]">
              {primaryLink.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            {secondaryLink && (
              <Link href={secondaryLink.href} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-default)] px-5 py-3 text-sm font-bold text-[var(--color-brand-brown)] transition hover:bg-[var(--color-bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)]">
                {secondaryLink.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="coming-soon-highlights" className="space-y-4">
        <div>
          <h2 id="coming-soon-highlights" className="text-xl font-black text-[var(--color-brand-brown)] sm:text-2xl">What we&apos;re planning</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">A preview of the intended experience, not features available today.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((highlight) => (
            <article key={highlight.title} className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-[var(--color-brand-brown)]">{highlight.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{highlight.description}</p>
            </article>
          ))}
        </div>
      </section>

      <p role="status" className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-3 text-xs leading-6 text-[var(--color-text-secondary)] sm:text-sm">
        {availabilityNote}
      </p>
    </div>
  );
}
