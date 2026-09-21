import { redirect } from 'next/navigation';

// Historical sample standings were not backed by ballots. Use the durable JuanChoice hub.
export default function CommunityChoiceLeaderboardPage() { redirect('/choice'); }
