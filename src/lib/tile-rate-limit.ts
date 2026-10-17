const CAPACITY = 400;
const REFILL_PER_SECOND = 10;
const MAX_CLIENTS = 10_000;

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export function tileClientKey(headers: Headers): string {
  const cloudflareIp = headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) return cloudflareIp;
  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || 'local';
}

/** Consume one tile request from a bounded per-client token bucket. */
export function takeToken(key: string, now = Date.now()): boolean {
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_CLIENTS) evictOldest();
    bucket = { tokens: CAPACITY, updatedAt: now };
    buckets.set(key, bucket);
  } else {
    const elapsedSeconds = Math.max(0, now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsedSeconds * REFILL_PER_SECOND);
    bucket.updatedAt = Math.max(now, bucket.updatedAt);
  }

  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function evictOldest() {
  const oldestKey = buckets.keys().next().value as string | undefined;
  if (oldestKey !== undefined) buckets.delete(oldestKey);
}
