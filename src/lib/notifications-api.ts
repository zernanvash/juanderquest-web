import { api } from '@/lib/api';

export type DurableNotification = {
  id: string;
  kind: 'quest_funding' | 'sponsorship' | 'quest_reward' | 'follow' | 'cheer' | 'comment' | 'overtaken' | 'weekly_recap' | 'weekly_champion';
  title: string;
  message: string;
  href: string;
  created_at: string;
  read: boolean;
};

export async function getNotifications(limit = 30): Promise<DurableNotification[]> {
  const response = await api.get('/notifications', { params: { limit }, timeout: 8000 });
  return response.data?.data?.items ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${encodeURIComponent(id)}/read`, {}, { timeout: 8000 });
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all', {}, { timeout: 8000 });
}
