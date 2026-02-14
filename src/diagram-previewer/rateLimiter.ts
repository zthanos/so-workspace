/**
 * Rate limiter for controlling the frequency of operations
 * Enforces a minimum time interval between executions
 */
export class RateLimiter {
  private lastCallTime: number = 0;
  private readonly minInterval: number;

  /**
   * Create a new RateLimiter
   * @param minIntervalMs - Minimum interval between calls in milliseconds
   */
  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  /**
   * Throttle execution of a function to enforce minimum interval
   * If called too soon after the last call, delays execution
   * @param fn - Async function to execute
   * @returns Promise that resolves after delay + function execution
   */
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    const delay = Math.max(0, this.minInterval - timeSinceLastCall);

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastCallTime = Date.now();
    return fn();
  }
}
