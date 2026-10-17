import type { ActivityItem } from '@/lib/plaza-api';

export interface FormattedActivity {
  sentence: string;
  pointsBadge?: string;
  badgeIcon?: string;
}

export function formatActivityText(activity: ActivityItem): FormattedActivity {
  const actor = activity.actor.display_name || 'An explorer';
  const subject = activity.subject.title || 'a destination';
  const payload = activity.payload || {};

  switch (activity.verb) {
    case 'quest_completed': {
      const pts = payload.points ? `+${payload.points} pts` : undefined;
      return {
        sentence: `${actor} completed ${subject}`,
        pointsBadge: pts,
      };
    }
    case 'trail_completed':
      return { sentence: `${actor} finished the ${subject} trail` };
    case 'town_completed':
      return { sentence: `${actor} completed every Eco-Quest in ${subject} 🎉` };
    case 'badge_earned': {
      const icon = payload.icon || '🏅';
      return {
        sentence: `${actor} earned the ${subject} badge ${icon}`,
        badgeIcon: icon,
      };
    }
    case 'level_up': {
      const level = payload.level || 1;
      const title = payload.title ? ` · ${payload.title}` : '';
      return { sentence: `${actor} reached Level ${level}${title}` };
    }
    case 'streak_milestone': {
      const rounds = payload.rounds || 4;
      return { sentence: `${actor} voted in ${rounds} JuanChoice rounds in a row 🔥` };
    }
    case 'rank_top10': {
      const rank = payload.rank ? `(#${payload.rank})` : 'top 10';
      return { sentence: `${actor} entered this week's top 10 ${rank}` };
    }
    case 'weekly_champion': {
      const place = payload.place || 1;
      const week = payload.week_id || 'this week';
      if (place === 1) {
        return { sentence: `${actor} is the Weekly Champion of ${week} 🏆` };
      }
      return { sentence: `${actor} finished #${place} in ${week}` };
    }
    case 'spot_posted':
      return { sentence: `${actor} shared a new spot: ${subject}` };
    case 'first_photo':
      return { sentence: `${actor} added the first photo of ${subject} 📸` };
    case 'juanchoice_voted':
      return { sentence: `${actor} voted in JuanChoice` };
    case 'quiz_aced': {
      const score = payload.score ?? 5;
      const max = payload.max_score ?? 5;
      return { sentence: `${actor} aced the ${subject} quiz (${score}/${max})` };
    }
    default:
      return { sentence: `${actor} explored ${subject}` };
  }
}
