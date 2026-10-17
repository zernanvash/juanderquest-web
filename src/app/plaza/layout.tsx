import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Plaza',
  'Rankings, rivals and what Pangasinan explorers are up to right now.',
  '/plaza'
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
