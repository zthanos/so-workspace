/**
 * Integration tests for RenderCache with renderers
 * Validates that cache integration works correctly across the system
 * 
 * Requirements: 5.5 (Cache rendered diagrams)
 */

import { RenderCache } from './renderCache';
import { MermaidRenderer } from './renderers/mermaidRenderer';
import { KrokiRenderer } from './renderers/krokiRenderer';
import { RenderOptions } from './types';

describe('Cache Integration', () => {
  let cache: RenderCache;

  beforeEach(() => {
    cache = new RenderCache(50);
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Cache key generation', () => {
    test('should generate consistent cache keys for same content', () => {
      const filePath = '/test/diagram.mmd';
      const content = 'graph TD\n  A-->B';

      const key1 = RenderCache.generateKey(filePath, content);
      const key2 = RenderCache.generateKey(filePath, content);

      expect(key1).toBe(key2);
      expect(key1).toContain(filePath);
      expect(key1).toContain(':');
    });

    test('should generate different cache keys for different content', () => {
      const filePath = '/test/diagram.mmd';
      const content1 = 'graph TD\n  A-->B';
      const content2 = 'graph TD\n  A-->C';

      const key1 = RenderCache.generateKey(filePath, content1);
      const key2 = RenderCache.generateKey(filePath, content2);

      expect(key1).not.toBe(key2);
    });

    test('should generate different cache keys for different files', () => {
      const content = 'graph TD\n  A-->B';
      const filePath1 = '/test/diagram1.mmd';
      const filePath2 = '/test/diagram2.mmd';

      const key1 = RenderCache.generateKey(filePath1, content);
      const key2 = RenderCache.generateKey(filePath2, content);

      expect(key1).not.toBe(key2);
    });
  });

  describe('MermaidRenderer cache integration', () => {
    test('should use cache when rendering same content twice', async () => {
      const mockWebview = {
        postMessage: jest.fn().mockResolvedValue(undefined),
        onDidReceiveMessage: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      } as any;

      const renderer = new MermaidRenderer(mockWebview, cache);
      const content = 'graph TD\n  A-->B';
      const cacheKey = RenderCache.generateKey('/test/diagram.mmd', content);

      const options: RenderOptions = {
        theme: 'light',
        cacheKey,
      };

      // First render - should not be cached
      expect(cache.has(cacheKey)).toBe(false);

      // Manually add to cache to simulate successful render
      cache.set(cacheKey, {
        type: 'svg',
        content: '<svg>test</svg>',
      });

      // Second render - should use cache
      const result = await renderer.render(content, options);

      expect(result.type).toBe('svg');
      expect(result.content).toBe('<svg>test</svg>');
      expect(cache.has(cacheKey)).toBe(true);

      renderer.dispose();
    });
  });

  describe('KrokiRenderer cache integration', () => {
    test('should use cache when rendering same content twice', async () => {
      const renderer = new KrokiRenderer(cache, {
        endpoint: 'https://kroki.io',
        rateLimit: 500,
      });

      const content = '@startuml\nAlice -> Bob\n@enduml';
      const cacheKey = RenderCache.generateKey('/test/diagram.puml', content);

      const options: RenderOptions = {
        theme: 'light',
        cacheKey,
      };

      // First render - should not be cached
      expect(cache.has(cacheKey)).toBe(false);

      // Manually add to cache to simulate successful render
      cache.set(cacheKey, {
        type: 'svg',
        content: '<svg>plantuml diagram</svg>',
      });

      // Second render - should use cache
      const result = await renderer.render(content, options);

      expect(result.type).toBe('svg');
      expect(result.content).toBe('<svg>plantuml diagram</svg>');
      expect(cache.has(cacheKey)).toBe(true);

      renderer.dispose();
    });
  });

  describe('Cache behavior with multiple renders', () => {
    test('should cache results from different renderers independently', () => {
      const mermaidKey = RenderCache.generateKey('/test/diagram.mmd', 'graph TD\n  A-->B');
      const krokiKey = RenderCache.generateKey('/test/diagram.puml', '@startuml\nAlice -> Bob\n@enduml');

      cache.set(mermaidKey, {
        type: 'svg',
        content: '<svg>mermaid</svg>',
      });

      cache.set(krokiKey, {
        type: 'svg',
        content: '<svg>plantuml</svg>',
      });

      expect(cache.has(mermaidKey)).toBe(true);
      expect(cache.has(krokiKey)).toBe(true);

      const mermaidResult = cache.get(mermaidKey);
      const krokiResult = cache.get(krokiKey);

      expect(mermaidResult?.content).toBe('<svg>mermaid</svg>');
      expect(krokiResult?.content).toBe('<svg>plantuml</svg>');
    });

    test('should respect cache size limit', () => {
      const smallCache = new RenderCache(3);

      // Add 4 items (exceeds limit)
      for (let i = 0; i < 4; i++) {
        const key = RenderCache.generateKey(`/test/diagram${i}.mmd`, `content${i}`);
        smallCache.set(key, {
          type: 'svg',
          content: `<svg>${i}</svg>`,
        });
      }

      // Cache should only have 3 items (oldest evicted)
      expect(smallCache.size()).toBe(3);

      // First item should be evicted
      const firstKey = RenderCache.generateKey('/test/diagram0.mmd', 'content0');
      expect(smallCache.has(firstKey)).toBe(false);

      // Last 3 items should still be there
      for (let i = 1; i < 4; i++) {
        const key = RenderCache.generateKey(`/test/diagram${i}.mmd`, `content${i}`);
        expect(smallCache.has(key)).toBe(true);
      }
    });
  });
});
