/**
 * Async rate-limit store interface. The check is atomic per-key:
 * implementations must increment-and-test (or equivalent) so that two
 * concurrent invocations cannot both succeed at the bucket boundary.
 */
export interface RateLimitStore {
  /**
   * Try to consume one unit against `key` within `windowMs`. The
   * implementation is responsible for constructing or refreshing the
   * window as needed.
   */
  check(
    key: string,
    options: { max: number; windowMs: number },
  ): Promise<{ success: boolean; remaining: number; resetAt: number }>;
}
