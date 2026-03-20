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

export const ratelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes for login
      analytics: true,
      prefix: "@upstash/ratelimit/login",
    })
  : null;

/**
 * Helper to check rate limit for a specific identifier (e.g., IP)
 * Returns { success: true } if no redis is configured but uses in-memory fallback
 */
export async function checkRateLimit(identifier: string, limit = 5, window = "15 m") {
  if (ratelimit) {
    return await ratelimit.limit(identifier);
  }

  // Fallback to in-memory (approximate "15 m" as 15 * 60 * 1000)
  const windowMs = window.includes("m") ? parseInt(window) * 60 * 1000 : 15 * 60 * 1000;
  return checkMemoryLimit(identifier, limit, windowMs);
}
