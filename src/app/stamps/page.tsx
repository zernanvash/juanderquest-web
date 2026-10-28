import { pageMetadata } from '@/lib/page-metadata';
import { StampsClient } from './StampsClient';

export const metadata = pageMetadata(
  'Passport Stamps',
  'Claim daily stamps, finish missions, protect your streak and see what stamps can buy in JuanDerQuest.',
  '/stamps',
);

export default function StampsPage() {
  return <StampsClient />;
}
