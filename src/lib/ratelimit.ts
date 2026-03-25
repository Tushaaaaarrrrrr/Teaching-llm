import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Simple in-memory fallback for rate limiting
const memoStore = new Map<string, { count: number; expires: number }>();

function checkMemoryLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = memoStore.get(identifier);

  if (!record || now > record.expires) {
    memoStore.set(identifier, { count: 1, expires: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.expires };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, reset: record.expires };
}

// Check if Upstash credentials exist
const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export const redis = hasRedis ? Redis.fromEnv() : null;
export const MAINTENANCE_KEY = 'system:maintenance_mode';


export const ratelimit = hasRedis
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(5, "15 m"), // default for login
      analytics: true,
      prefix: "@upstash/ratelimit",
    })
  : null;

// Specialized limiters for specific actions
const commentLimit = hasRedis ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(1, "10 s"),
  prefix: "@upstash/ratelimit/comment",
}) : null;

const generalLimit = hasRedis ? new Ratelimit({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "@upstash/ratelimit/general",
}) : null;

export async function setMaintenanceMode(enabled: boolean) {
  if (redis) {
    await redis.set(MAINTENANCE_KEY, enabled ? 'on' : 'off');
  }
}

export async function isMaintenanceModeActive(): Promise<boolean> {
  if (redis) {
    const val = await redis.get(MAINTENANCE_KEY);
    return val === 'on';
  }
  return false;
}

/**
 * Helper to check rate limit for a specific identifier and action type
 */
export async function checkRateLimit(identifier: string, type: 'login' | 'comment' | 'general' | 'feedback' = 'general') {
  if (hasRedis) {
    if (type === 'comment' && commentLimit) return await commentLimit.limit(identifier);
    if (type === 'general' && generalLimit) return await generalLimit.limit(identifier);
    if (ratelimit) return await ratelimit.limit(identifier);
  }

  // Fallback to in-memory
  const limits = {
    login: { count: 5, window: 15 * 60 * 1000 },
    comment: { count: 1, window: 10 * 1000 },
    feedback: { count: 1, window: 60 * 1000 }, // 1 per minute per IP/User
    general: { count: 20, window: 60 * 1000 },
  };

  const { count, window } = limits[type];
  return checkMemoryLimit(`${type}:${identifier}`, count, window);
}
