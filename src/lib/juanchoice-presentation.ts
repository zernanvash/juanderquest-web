import type { JuanChoiceOverview, JuanChoiceStatus } from './juanchoice';

export type JuanChoiceDisplayMode = 'unknown' | 'write_enabled' | 'read_only';

/** The demo build must never vote against the ordinary API, nor vice versa. */
export function isJuanChoiceEnvironmentTrusted(
  overview: Pick<JuanChoiceOverview, 'environment'> | null | undefined,
  presentationBuild: boolean,
): boolean {
  if (!overview) return false;
  return presentationBuild
    ? overview.environment === 'presentation_demo'
    : overview.environment === undefined;
}

export interface JuanChoiceDisplayPresentation {
  mode: JuanChoiceDisplayMode;
  readOnlyNotice: string | null;
  headerTitle: string;
  headerDescription: string;
  roundWindowLabel: string;
  nextRoundWindowLabel: string;
  educationalRewardCopy: string;
  nextRoundHeading: string;
  nextRoundPrefix: string;
}

/**
 * Derives the JuanChoice presentation display mode and truthful copy.
 *
 * Rules:
 * 1. Mode is 'unknown' if overview or availability is missing.
 * 2. Mode is 'write_enabled' ONLY if overview.availability.voting_enabled === true.
 * 3. Mode is 'read_only' if overview.availability.voting_enabled === false.
 * 4. Never infer write access from campaign or schedule status alone.
 * 5. When read-only, show unambiguous notice across all valid page states (no campaign, scheduled, voting, closed).
 * 6. Conditionalize educational copy so we do not promise open voting when writes are disabled.
 */
export function deriveJuanChoiceDisplayMode(
  overview: Pick<JuanChoiceOverview, 'availability'> | null | undefined,
): JuanChoiceDisplayMode {
  if (!overview || !overview.availability || typeof overview.availability.voting_enabled !== 'boolean') {
    return 'unknown';
  }
  return overview.availability.voting_enabled ? 'write_enabled' : 'read_only';
}

export function getJuanChoicePresentation(
  overview: Pick<JuanChoiceOverview, 'availability'> | null | undefined,
  campaignStatus: JuanChoiceStatus | null | undefined,
): JuanChoiceDisplayPresentation {
  const mode = deriveJuanChoiceDisplayMode(overview);

  if (mode === 'write_enabled') {
    return {
      mode: 'write_enabled',
      readOnlyNotice: null,
      headerTitle: 'Choose a destination worth discovering',
      headerDescription:
        'One free ballot per round. Every participant earns the same 25 Civic XP and one stamp, regardless of which destination wins. This is separate from governance voting and mJDQ.',
      roundWindowLabel:
        campaignStatus === 'voting'
          ? 'Voting closes'
          : campaignStatus === 'scheduled'
            ? 'Voting opens'
            : 'Round closed',
      nextRoundWindowLabel: 'Voting opens',
      educationalRewardCopy:
        'One free ballot per round. Every voter earns the same 25 Civic XP and one stamp.',
      nextRoundHeading: 'Next community vote',
      nextRoundPrefix: 'Next round opens',
    };
  }

  if (mode === 'read_only') {
    return {
      mode: 'read_only',
      readOnlyNotice:
        'Community voting is unavailable in this alpha. You can explore the schedule and previous results.',
      headerTitle: 'Community destination spotlight',
      headerDescription:
        'Explore community-supported destinations. If voting becomes available, participants earn 25 Civic XP and one stamp per round regardless of which destination wins (separate from governance voting and mJDQ).',
      roundWindowLabel:
        campaignStatus === 'voting'
          ? 'Round closes'
          : campaignStatus === 'scheduled'
            ? 'Scheduled round begins'
            : 'Round closed',
      nextRoundWindowLabel: 'Scheduled round begins',
      educationalRewardCopy:
        'When voting is active, ballots are free and voters earn 25 Civic XP and one stamp per round.',
      nextRoundHeading: 'Next scheduled round',
      nextRoundPrefix: 'Scheduled round begins',
    };
  }

  // mode === 'unknown' (loading or missing overview)
  return {
    mode: 'unknown',
    readOnlyNotice: null,
    headerTitle: 'Community destination spotlight',
    headerDescription:
      'Explore community-supported destinations. When active, participants earn 25 Civic XP and one stamp per round regardless of which destination wins.',
    roundWindowLabel:
      campaignStatus === 'voting'
        ? 'Round closes'
        : campaignStatus === 'scheduled'
          ? 'Scheduled round'
          : 'Round closed',
    nextRoundWindowLabel: 'Scheduled round',
    educationalRewardCopy:
      'When active, ballots are free and voters earn 25 Civic XP and one stamp per round.',
    nextRoundHeading: 'Next scheduled round',
    nextRoundPrefix: 'Scheduled round',
  };
}
