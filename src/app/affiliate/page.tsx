import type { Metadata } from 'next';
import { AffiliateClient } from './AffiliateClient';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata: Metadata = {
  ...pageMetadata(
    'Merchant Affiliate Hub — Coming Soon',
    'Dashboard and partner portal for Pangasinan merchants and local businesses. Apply to become an affiliate to co-sponsor official tourism quests and promote your establishment.',
    '/affiliate',
  ),
};

export default function AffiliatePage() {
  return <AffiliateClient />;
}
