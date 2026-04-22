import { createClient } from 'redis';

let _client: ReturnType<typeof createClient> | null = null;

async function getClient() {
  if (!_client) {
    _client = createClient({ url: process.env.REDIS_URL });
    _client.on('error', (err) => console.error('[Redis]', err));
    await _client.connect();
  }
  return _client;
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const client = await getClient();
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached) as T;

    const data = await fetcher();
    await client.setEx(key, ttlSeconds, JSON.stringify(data));
    return data;
  } catch {
    // Cache miss — fall through to fetcher (Redis failure is not fatal)
    return fetcher();
  }
}
