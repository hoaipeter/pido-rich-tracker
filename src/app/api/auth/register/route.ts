import { type NextRequest } from "next/server";
import { withErrorHandler, created, tooManyRequests } from "@backend/http/api-response";
import { clientIp, getRateLimiter } from "@backend/http/rate-limit";
import { userService } from "@backend/modules/users/user.service";
import { registerSchema } from "@shared/auth/schemas";

export const runtime = "nodejs";

// 5 register attempts per IP per hour. Tight by design — register is a
// rare operation; brute-forcing emails to discover the allowlist isn't
// productive at this rate. Same-origin enforcement happens in
// `withErrorHandler` for every non-GET /api/* route except /api/auth/*.
const limiter = getRateLimiter("register", { max: 5, windowMs: 60 * 60 * 1000 });

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = clientIp(request);
  const limit = await limiter.check(ip);
  if (!limit.success) {
    return tooManyRequests("Too many registration attempts. Try again later.");
  }

  const body = await request.json();
  const parsed = registerSchema.parse(body);
  const user = await userService.register(parsed);
  return created(user);
});
