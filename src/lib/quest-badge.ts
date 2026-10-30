/**
 * Label for the selected-place sheet badge when a quest is selected.
 * Plan 68 follow-up: the reward moved out of the sheet body, so it lives in the badge
 * (e.g. "Eco-Quest · +50 pts"). Quests without a positive reward keep the plain label.
 */
export function questBadgeLabel(quest: { rewardPoints?: number | null }): string {
  const points = Number(quest?.rewardPoints);
  if (!Number.isFinite(points) || points <= 0) return 'Eco-Quest';
  return `Eco-Quest · +${Math.round(points).toLocaleString('en-US')} pts`;
}
