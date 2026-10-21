import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { QuestBuilder } from '@/components/quest-builder/QuestBuilder';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditQuestPage({ params }: Props) {
  const { id } = await params;

  let quest: any = null;
  let spot: any = null;

  try {
    const questRes = await api.get(`/quests/${id}/edit`);
    quest = questRes.data?.data;

    if (quest?.spot_id) {
      const spotRes = await api.get(`/spots/${quest.spot_id}`);
      spot = spotRes.data?.data;
    }
  } catch (err) {
    notFound();
  }

  if (!quest) notFound();

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      <QuestBuilder
        isNew={false}
        initialQuest={quest}
        destination={{
          id: spot?.id || quest.spot_id || quest.destination_id || 'dest_1',
          name: spot?.name || quest.location_name || 'Destination',
          slug: spot?.slug || 'destination',
          lat: spot?.gps_lat || quest.gps_lat || 16.03,
          lng: spot?.gps_lng || quest.gps_lng || 120.33,
          municipality: spot?.municipality,
        }}
      />
    </div>
  );
}
