import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isResourceId } from '@/lib/routes';
import { loadSukiProgram } from './loader';
import styles from './suki.module.css';

/**
 * Plan 107: a printed Suki standee is a URL, so a phone camera lands here.
 * The web is the front door: it shows the card and sends people to the app;
 * visits are only recorded in the app (GPS at the shop).
 */
interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const program = await loadSukiProgram(id);
  const title = program ? `${program.merchant.name} Suki Card | JuanDerQuest` : 'Suki Card | JuanDerQuest';
  return {
    title: { absolute: title },
    description: program
      ? `Visit ${program.visits_required} times: ${program.reward_text}. Collect visits in the JuanDerQuest app.`
      : 'Collect Suki visits at partner shops in the JuanDerQuest app.',
    robots: { index: false, follow: false },
  };
}

export default async function SukiLandingPage({ params }: Props) {
  const { id } = await params;
  if (!isResourceId(id)) notFound();
  const program = await loadSukiProgram(id);
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {program ? (
          <>
            <p className={styles.kicker}>Suki Card</p>
            <h1 className={styles.shop}>{program.merchant.name}</h1>
            {program.merchant.municipality ? <p className={styles.town}>{program.merchant.municipality}</p> : null}
            <div className={styles.reward}>
              <span className={styles.tag}>{program.reward_tag}</span>
              <p>
                Visit <strong>{program.visits_required} times</strong>: {program.reward_text}
              </p>
            </div>
            <p className={styles.note}>
              One visit a day, collected at the shop counter in the JuanDerQuest app. Every visit also counts
              toward your passport missions and explorer badges.
            </p>
          </>
        ) : (
          <>
            <p className={styles.kicker}>Suki Card</p>
            <h1 className={styles.shop}>This Suki Card is not available</h1>
            <p className={styles.note}>It may be paused or replaced. Ask the shop for its current QR.</p>
          </>
        )}
        <Link className={styles.cta} href="/download">
          Get JuanDerQuest
        </Link>
        <p className={styles.note}>Already have the app? Open it and tap Shop → Suki Cards → Scan Suki.</p>
      </section>
    </main>
  );
}
