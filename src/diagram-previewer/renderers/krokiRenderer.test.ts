/**
 * Unit tests for KrokiRenderer
 */

import { KrokiRenderer } from './krokiRenderer';
import { RenderCache } from '../renderCache';
import { RenderResult } from '../types';

// Mock SvgSanitizer to avoid DOMParser issues in tests
jest.mock('../svgSanitizer', () => {
  return {
    SvgSanitizer: jest.fn().mockImplementation(() => {
      return {
        sanitize: jest.fn((svg: string) => svg), // Pass through SVG unchanged
      };
    }),
  };
});

// Mock RateLimiter to avoid delays in tests
jest.mock('../rateLimiter', () => {
  return {
    RateLimiter: jest.fn().mockImplementation(() => {
      return {
        throttle: jest.fn(async (fn) => await fn()), // Execute immediately without throttling
      };
    }),
  };
});

describe('KrokiRenderer', () => {
  let renderer: KrokiRenderer;
  let cache: RenderCache;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    cache = new RenderCache(50);
    
    // Spy on global fetch
    fetchSpy = jest.spyOn(global, 'fetch' as any);
    
    renderer = new KrokiRenderer(cache, {
      endpoint: 'https://kroki.io',
      rateLimit: 500,
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('getSupportedExtensions', () => {
    test('should return all Kroki-supported extensions', () => {
      const extensions = renderer.getSupportedExtensions();

      // Should include common Kroki extensions
      expect(extensions).toContain('.puml');
      expect(extensions).toContain('.plantuml');
      expect(extensions).toContain('.dot');
      expect(extensions).toContain('.gv');
      expect(extensions).toContain('.dsl');

      // Should not include Mermaid extensions
      expect(extensions).not.toContain('.mmd');
      expect(extensions).not.toContain('.mermaid');
    });

    test('should return only extensions mapped to kroki renderer', () => {
      const extensions = renderer.getSupportedExtensions();

      // All returned extensions should be for Kroki
      extensions.forEach(ext => {
        expect(ext).toMatch(/^\./); // Should start with dot
      });
    });
  });

  describe('render', () => {
    test('should return cached result if available', async () => {
      const cacheKey = 'test.puml:abc123';
      const cachedResult: RenderResult = {
        type: 'svg',
        content: '<svg>cached</svg>',
      };

      cache.set(cacheKey, cachedResult);

      const result = await renderer.render('test content', {
        theme: 'light',
        cacheKey,
      });

      expect(result).toEqual(cachedResult);
    });

    test('should return error for unknown file extension', async () => {
      const result = await renderer.render('test content', {
        theme: 'light',
        cacheKey: 'test.unknown:abc123',
      });

      expect(result.type).toBe('error');
      expect(result.error).toContain('Unable to detect diagram type');
    });
  });

  describe('content encoding', () => {
    test('should encode content using zlib + base64url', async () => {
      // Mock a successful response to verify encoding works
      const svgContent = '<svg>test</svg>';
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => svgContent,
      } as Response);

      const result = await renderer.render('test content', {
        theme: 'light',
        cacheKey: 'test.puml:abc123',
      });

      // Should successfully render
      expect(result.type).toBe('svg');
      expect(fetchSpy).toHaveBeenCalled();
      
      // Verify the URL contains encoded content
      const callUrl = (fetchSpy.mock.calls[0] as any)[0];
      expect(callUrl).toContain('https://kroki.io/plantuml/svg/');
    });
  });

  describe('dispose', () => {
    test('should dispose without errors', () => {
      expect(() => renderer.dispose()).not.toThrow();
    });
  });

  describe('error handling', () => {
    describe('4xx client errors', () => {
      test.skip('should display specific error for 400 Bad Request', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: jest.fn().mockResolvedValue('Invalid diagram syntax'),
        } as any);

        const result = await renderer.render('@startuml\ninvalid\n@enduml', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(fetchSpy).toHaveBeenCalled();
        expect(result.type).toBe('error');
        expect(result.error).toContain('Client error (400)');
        expect(result.error).toContain('Invalid diagram syntax');
      });

      test.skip('should display specific error for 404 Not Found', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: async () => 'Unknown diagram type',
        } as Response);

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Client error (404)');
        expect(result.error).toContain('Unknown diagram type');
      });

      test.skip('should display specific error for 422 Unprocessable Entity', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          text: async () => 'Syntax error at line 5',
        } as Response);

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Client error (422)');
        expect(result.error).toContain('Syntax error at line 5');
      });
    });

    describe('5xx server errors', () => {
      test.skip('should display generic error with retry message for 500 Internal Server Error', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error details',
        } as Response);

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Server error (500)');
        expect(result.error).toContain('Kroki service is experiencing issues');
        expect(result.error).toContain('try again later');
      });

      test.skip('should display generic error for 502 Bad Gateway', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          text: async () => '',
        } as Response);

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Server error (502)');
        expect(result.error).toContain('try again later');
      });

      test.skip('should display generic error for 503 Service Unavailable', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'Service temporarily unavailable',
        } as Response);

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Server error (503)');
        expect(result.error).toContain('try again later');
      });
    });

    describe('network errors', () => {
      test.skip('should display connection error when fetch fails', async () => {
        fetchSpy.mockRejectedValueOnce(new Error('fetch failed'));

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Connection error');
        expect(result.error).toContain('Unable to reach Kroki API');
        expect(result.error).toContain('https://kroki.io');
      });

      test.skip('should display connection error for network failure', async () => {
        fetchSpy.mockRejectedValueOnce(new Error('network error'));

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Connection error');
        expect(result.error).toContain('Check your internet connection');
      });

      test.skip('should suggest configuring custom endpoint in connection error', async () => {
        fetchSpy.mockRejectedValueOnce(new Error('fetch failed'));

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('configure a custom endpoint');
      });
    });

    describe('timeout handling', () => {
      test.skip('should timeout after 10 seconds', async () => {
        // Mock a request that simulates abort
        fetchSpy.mockImplementationOnce(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            }, 10100); // Slightly more than 10 seconds
          });
        });

        const startTime = Date.now();
        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });
        const duration = Date.now() - startTime;

        expect(result.type).toBe('error');
        expect(result.error).toContain('Request timeout');
        expect(result.error).toContain('10 seconds');
        expect(result.error).toContain('try again');
        
        // Should timeout around 10 seconds (allow some margin)
        expect(duration).toBeGreaterThanOrEqual(9900);
        expect(duration).toBeLessThan(11000);
      }, 15000); // Set test timeout to 15 seconds

      test.skip('should handle AbortError from timeout', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        fetchSpy.mockRejectedValueOnce(abortError);

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Request timeout');
        expect(result.error).toContain('did not respond within 10 seconds');
      });
    });

    describe('SVG fallback to PNG', () => {
      test.skip('should fallback to PNG when SVG request fails', async () => {
        // First call (SVG) fails
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'SVG rendering failed',
        } as Response);

        // Second call (PNG) succeeds
        const pngBuffer = Buffer.from('fake-png-data');
        fetchSpy.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          arrayBuffer: async () => pngBuffer.buffer.slice(pngBuffer.byteOffset, pngBuffer.byteOffset + pngBuffer.byteLength),
        } as Response);

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('png');
        expect(result.content).toContain('data:image/png;base64,');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      });

      test.skip('should return error if both SVG and PNG fail', async () => {
        // Both calls fail
        fetchSpy.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Rendering failed',
        } as Response);

        const result = await renderer.render('test content', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('error');
        expect(result.error).toContain('Server error (500)');
        expect(fetchSpy).toHaveBeenCalledTimes(2); // Tried both SVG and PNG
      });
    });

    describe('successful rendering', () => {
      test('should successfully render SVG', async () => {
        const svgContent = '<svg><rect width="100" height="100"/></svg>';
        fetchSpy.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => svgContent,
        } as Response);

        const result = await renderer.render('@startuml\nA -> B\n@enduml', {
          theme: 'light',
          cacheKey: 'test.puml:abc123',
        });

        expect(result.type).toBe('svg');
        expect(result.content).toContain('<svg>');
        expect(result.error).toBeUndefined();
      });

      test('should cache successful results', async () => {
        const svgContent = '<svg><rect width="100" height="100"/></svg>';
        fetchSpy.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => svgContent,
        } as Response);

        const cacheKey = 'test.puml:abc123';
        
        // First render
        const result1 = await renderer.render('@startuml\nA -> B\n@enduml', {
          theme: 'light',
          cacheKey,
        });

        // Second render should use cache
        const result2 = await renderer.render('@startuml\nA -> B\n@enduml', {
          theme: 'light',
          cacheKey,
        });

        expect(result1).toEqual(result2);
        expect(fetchSpy).toHaveBeenCalledTimes(1); // Only called once
      });
    });
  });
});
