import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  points: number;
  duration: number;
}

const defaultConfig: RateLimitConfig = {
  points: 100,
  duration: 60,
};

const tokenBuckets = new Map<string, { points: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const bucket = tokenBuckets.get(identifier);

  if (!bucket || bucket.resetTime < now) {
    tokenBuckets.set(identifier, {
      points: config.points - 1,
      resetTime: now + config.duration * 1000,
    });
    return { allowed: true, remaining: config.points - 1, resetTime: now + config.duration * 1000 };
  }

  if (bucket.points <= 0) {
    return { allowed: false, remaining: 0, resetTime: bucket.resetTime };
  }

  bucket.points -= 1;
  return { allowed: true, remaining: bucket.points, resetTime: bucket.resetTime };
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = defaultConfig,
  getIdentifier?: (request: NextRequest) => string
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const identifier = getIdentifier 
      ? getIdentifier(request) 
      : request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
        || request.headers.get("x-real-ip") 
        || "unknown";

    const { allowed, remaining, resetTime } = checkRateLimit(identifier, config);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: Math.ceil((resetTime - Date.now()) / 1000) },
        { 
          status: 429,
          headers: { 
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
            "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    const response = await handler(request);
    
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetTime / 1000)));
    
    return response;
  };
}
