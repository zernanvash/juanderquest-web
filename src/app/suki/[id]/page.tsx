import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isResourceId } from '@/lib/routes';
import { loadSukiProgram, safeLogoUrl } from './loader';
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
  const result = await loadSukiProgram(id);
  const program = result.kind === 'found' ? result.program : null;
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
  const result = await loadSukiProgram(id);
  const program = result.kind === 'found' ? result.program : null;
  const pointsMenu = result.kind === 'found' ? result.pointsMenu : [];
  const logo = safeLogoUrl(program?.merchant.logo_url);
  const tiers = program?.tiers && program.tiers.length > 0 ? program.tiers : null;
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>Suki Card</p>
        {program ? (
          <>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.logo} src={logo} alt={`${program.merchant.name} logo`} width={72} height={72} />
            ) : null}
            <h1 className={styles.shop}>{program.merchant.name}</h1>
            {program.merchant.municipality ? <p className={styles.town}>{program.merchant.municipality}</p> : null}
            {tiers && tiers.length > 1 ? (
              <div className={styles.reward}>
                <p className={styles.ladderHeading}>Milestone rewards</p>
                <ul className={styles.ladderList}>
                  {tiers.map((tier) => (
                    <li key={tier.visit_number} className={styles.ladderItem}>
                      <span className={styles.tag}>{tier.reward_tag}</span>
                      <span>
                        Visit <strong>{tier.visit_number}</strong>: {tier.reward_text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.reward}>
                <span className={styles.tag}>{program.reward_tag}</span>
                <p>
                  Visit <strong>{program.visits_required} times</strong>: {program.reward_text}
                </p>
              </div>
            )}
            {program.points?.enabled ? (
              <div className={styles.pointsBox}>
                <p className={styles.pointsTitle}>Earn Suki Points</p>
                <p className={styles.pointsSub}>
                  +{program.points.per_visit} pts every visit
                  {program.points.pesos_per_point ? ` · +1 pt per ₱${program.points.pesos_per_point} spent` : ''}
                </p>
                {pointsMenu.length > 0 ? (
                  <ul className={styles.pointsList}>
                    {pointsMenu.slice(0, 4).map((item) => (
                      <li key={item.id}>
                        {item.title} — <strong>{item.points_cost} pts</strong>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {program.status === 'paused' ? (
              <p className={styles.note}>This Suki Card is paused right now. Ask the shop when it starts again.</p>
            ) : (
              <p className={styles.note}>
                One visit a day, collected at the shop in the JuanDerQuest app. Every visit also counts toward your
                passport missions and explorer badges.
              </p>
            )}
          </>
        ) : result.kind === 'disabled' ? (
          <>
            <h1 className={styles.shop}>Suki Cards are coming soon</h1>
            <p className={styles.note}>Get the app now and start collecting visits as soon as Suki Cards open.</p>
          </>
        ) : (
          <>
            <h1 className={styles.shop}>This Suki Card was not found</h1>
            <p className={styles.note}>It may have been replaced. Ask the shop for its current QR.</p>
          </>
        )}
        <Link className={styles.cta} href="/download">
          Get JuanDerQuest
        </Link>
        <p className={styles.note}>Already have the app? Open it and tap Scan Suki.</p>
      </section>
    </main>
  );
}
