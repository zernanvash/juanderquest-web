import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertCircle, RefreshCw, Compass } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { fetchPublicUserProfile } from '@/lib/search';
import { UserProfileView } from './UserProfileView';

export const dynamic = 'force-dynamic';

export default async function PublicTravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchPublicUserProfile(id);

  if (result.kind === 'not_found') {
    notFound();
  }

  if (result.kind === 'error') {
    return (
      <Navigation>
        <div className="mx-auto max-w-lg py-16 px-4 text-center space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-amber-100 text-[#B45309]">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl font-black text-[#2C221E]">
            Profile Temporarily Unavailable
          </h1>
          <p className="text-xs text-[#514532]">
            {result.message}
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href={`/users/${encodeURIComponent(id)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D6A4F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1B4332] transition min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3DFD5] bg-white px-4 py-2.5 text-xs font-bold text-[#582F0E] hover:bg-[#FAF9F5] transition min-h-[44px]"
            >
              <Compass className="h-4 w-4 text-[#2D6A4F]" />
              <span>Explore Destinations</span>
            </Link>
          </div>
        </div>
      </Navigation>
    );
  }

  const profile = result.profile;
  if (!profile.is_public) {
    notFound();
  }

  return (
    <Navigation>
      <UserProfileView profile={profile} />
    </Navigation>
  );
}
