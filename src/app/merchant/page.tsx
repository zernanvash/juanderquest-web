import { Metadata } from 'next';
import { MerchantClient } from './MerchantClient';

export const metadata: Metadata = {
  title: 'Merchant Dashboard',
  description: 'Manage your verified merchant showcase profile, catalog, and visitor information.',
};

export default function MerchantPage() {
  return <MerchantClient />;
}
