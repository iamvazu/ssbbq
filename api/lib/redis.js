import { Redis } from '@upstash/redis';

export function getRedis() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_URL ||
    process.env.REDIS_URL;

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_TOKEN ||
    process.env.REDIS_TOKEN;

  if (url && token) {
    return new Redis({ url, token });
  }

  // Fallback to Redis.fromEnv() if standard env keys are present
  try {
    return Redis.fromEnv();
  } catch (err) {
    throw new Error(
      'Upstash Redis database is not connected. Please connect Upstash Redis in your Vercel project Storage tab (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN).'
    );
  }
}
