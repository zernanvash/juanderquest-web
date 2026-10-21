import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { QuestBuilder } from '@/components/quest-builder/QuestBuilder';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NewQuestPage({ params }: Props) {
  const { slug } = await params;

  let spot: any = null;
  try {
    const res = await api.get(`/spots/${slug}`);
    spot = res.data?.data;
  } catch (err) {
    notFound();
  }

  if (!spot) notFound();

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      <QuestBuilder
        isNew={true}
        destination={{
          id: spot.id,
          name: spot.name,
          slug: spot.slug,
          lat: spot.gps_lat,
          lng: spot.gps_lng,
          municipality: spot.municipality,
        }}
      />
    </div>
  );
}
