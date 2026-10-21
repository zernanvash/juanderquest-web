import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { QrSheet, QrSheetData } from '@/components/quest-builder/QrSheet';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QrSheetPage({ params }: Props) {
  const { id } = await params;

  let sheetData: QrSheetData | null = null;
  try {
    const res = await api.get(`/quests/${id}/qr-sheet`);
    sheetData = res.data?.data;
  } catch (err) {
    notFound();
  }

  if (!sheetData) notFound();

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      <QrSheet data={sheetData} />
    </div>
  );
}
