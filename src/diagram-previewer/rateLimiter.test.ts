import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
  describe('throttle()', () => {
    test('should execute function immediately on first call', async () => {
      const rateLimiter = new RateLimiter(500);
      const mockFn = jest.fn(async () => 'result');

      const startTime = Date.now();
      const result = await rateLimiter.throttle(mockFn);
      const elapsed = Date.now() - startTime;

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(elapsed).toBeLessThan(50); // Should be nearly instant
    });

    test('should delay execution if called too soon', async () => {
      const rateLimiter = new RateLimiter(500);
      const mockFn = jest.fn(async () => 'result');

      // First call
      await rateLimiter.throttle(mockFn);

      // Second call immediately after
      const startTime = Date.now();
      await rateLimiter.throttle(mockFn);
      const elapsed = Date.now() - startTime;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(elapsed).toBeGreaterThanOrEqual(450); // Should wait ~500ms (with some tolerance)
      expect(elapsed).toBeLessThan(600); // But not too long
    });

    test('should not delay if enough time has passed', async () => {
      const rateLimiter = new RateLimiter(100);
      const mockFn = jest.fn(async () => 'result');

      // First call
      await rateLimiter.throttle(mockFn);

      // Wait longer than minInterval
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second call should not be delayed
      const startTime = Date.now();
      await rateLimiter.throttle(mockFn);
      const elapsed = Date.now() - startTime;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(elapsed).toBeLessThan(50); // Should be nearly instant
    });

    test('should return the result of the function', async () => {
      const rateLimiter = new RateLimiter(100);
      const mockFn = jest.fn(async () => ({ data: 'test', value: 42 }));

      const result = await rateLimiter.throttle(mockFn);

      expect(result).toEqual({ data: 'test', value: 42 });
    });

    test('should propagate errors from the function', async () => {
      const rateLimiter = new RateLimiter(100);
      const error = new Error('Test error');
      const mockFn = jest.fn(async () => {
        throw error;
      });

      await expect(rateLimiter.throttle(mockFn)).rejects.toThrow('Test error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple rapid calls correctly', async () => {
      const rateLimiter = new RateLimiter(200);
      const mockFn = jest.fn(async () => 'result');

      const startTime = Date.now();

      // Make 3 rapid calls - when called with Promise.all, they all start at the same time
      // so they all see the same lastCallTime and calculate similar delays
      const promises = [
        rateLimiter.throttle(mockFn),
        rateLimiter.throttle(mockFn),
        rateLimiter.throttle(mockFn),
      ];

      await Promise.all(promises);
      const elapsed = Date.now() - startTime;

      expect(mockFn).toHaveBeenCalledTimes(3);
      // All three calls start at nearly the same time, so they all wait ~200ms
      // Total should be around 200ms (not 400ms)
      expect(elapsed).toBeGreaterThanOrEqual(180);
      expect(elapsed).toBeLessThan(300);
    });

    test('should work with different minInterval values', async () => {
      const rateLimiter = new RateLimiter(50);
      const mockFn = jest.fn(async () => 'result');

      await rateLimiter.throttle(mockFn);

      const startTime = Date.now();
      await rateLimiter.throttle(mockFn);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(40); // ~50ms with tolerance
      expect(elapsed).toBeLessThan(100);
    });

    test('should handle zero minInterval', async () => {
      const rateLimiter = new RateLimiter(0);
      const mockFn = jest.fn(async () => 'result');

      const startTime = Date.now();
      await rateLimiter.throttle(mockFn);
      await rateLimiter.throttle(mockFn);
      const elapsed = Date.now() - startTime;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(elapsed).toBeLessThan(50); // Both should execute immediately
    });

    test('should track time correctly across multiple calls', async () => {
      const rateLimiter = new RateLimiter(100);
      const mockFn = jest.fn(async () => 'result');

      // Call 1: immediate
      await rateLimiter.throttle(mockFn);

      // Wait 50ms
      await new Promise(resolve => setTimeout(resolve, 50));

      // Call 2: should wait ~50ms more
      const startTime = Date.now();
      await rateLimiter.throttle(mockFn);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(elapsed).toBeLessThan(100);
    });
  });
});
