import { UnifiedProfileClient } from './UnifiedProfileClient';

export default async function UnifiedProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <UnifiedProfileClient username={username} />;
}
