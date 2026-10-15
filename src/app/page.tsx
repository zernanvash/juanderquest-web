import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get('user-agent') ?? '';

  // Send Android visitors from the root entry directly to the native app
  // download page. The download route itself is excluded by this root-only
  // handler, so it cannot create a redirect loop.
  redirect(/Android/i.test(userAgent) ? '/download' : '/dashboard');
}
