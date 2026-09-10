import { PreviewUserProfile } from './PreviewUserProfile';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evaluator traveler preview', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PreviewUserProfile id={(await params).id} />;
}
