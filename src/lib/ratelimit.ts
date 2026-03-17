import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash credentials exist
const hasRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

export const ratelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes
      analytics: true,
      prefix: "@upstash/ratelimit/login",
    })
  : null;

/**
 * Helper to check rate limit for a specific identifier (e.g., IP)
 * Returns { success: true } if no redis is configured
 */
export async function checkRateLimit(identifier: string) {
  if (!ratelimit) return { success: true, remaining: 5, reset: Date.now() };
  return await ratelimit.limit(identifier);
}
