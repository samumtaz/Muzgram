import { createClient } from 'redis';

let _client: ReturnType<typeof createClient> | null = null;
let _failed = false;

async function getClient() {
  if (_failed) throw new Error('Redis unavailable');
  if (_client?.isReady) return _client;

  if (!process.env.REDIS_URL || process.env.REDIS_URL === 'redis://localhost:6379') {
    _failed = true;
    throw new Error('Redis not configured');
  }

  _client = createClient({
    url: process.env.REDIS_URL,
    socket: { connectTimeout: 2000, reconnectStrategy: false },
  });
  _client.on('error', () => { _failed = true; _client = null; });

  try {
    await _client.connect();
  } catch {
    _failed = true;
    _client = null;
    throw new Error('Redis connect failed');
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
    await client.setEx(key, ttlSeconds, JSON.stringify(data)).catch(() => {});
    return data;
  } catch {
    return fetcher();
  }
}
