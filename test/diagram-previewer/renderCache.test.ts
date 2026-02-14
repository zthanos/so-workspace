/**
 * Unit tests for RenderCache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RenderCache } from '../../src/diagram-previewer/renderCache';
import { RenderResult } from '../../src/diagram-previewer/types';

describe('RenderCache', () => {
  let cache: RenderCache;

  beforeEach(() => {
    cache = new RenderCache(3); // Small cache for testing
  });

  describe('Basic operations', () => {
    it('should store and retrieve values', () => {
      const result: RenderResult = {
        type: 'svg',
        content: '<svg>test</svg>',
      };
      const key = 'test.mmd:hash123';

      cache.set(key, result);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(result);
    });

    it('should return undefined for non-existent keys', () => {
      const retrieved = cache.get('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should track cache size correctly', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', { type: 'svg', content: 'content1' });
      expect(cache.size()).toBe(1);

      cache.set('key2', { type: 'svg', content: 'content2' });
      expect(cache.size()).toBe(2);
    });

    it('should check if key exists', () => {
      cache.set('key1', { type: 'svg', content: 'content1' });
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', { type: 'svg', content: 'content1' });
      cache.set('key2', { type: 'svg', content: 'content2' });
      
      expect(cache.size()).toBe(2);
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxSize exceeded', () => {
      // Cache size is 3
      cache.set('key1', { type: 'svg', content: 'content1' });
      cache.set('key2', { type: 'svg', content: 'content2' });
      cache.set('key3', { type: 'svg', content: 'content3' });
      
      expect(cache.size()).toBe(3);
      expect(cache.has('key1')).toBe(true);
      
      // Adding 4th entry should evict key1 (oldest)
      cache.set('key4', { type: 'svg', content: 'content4' });
      
      expect(cache.size()).toBe(3);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update access order on get', () => {
      cache.set('key1', { type: 'svg', content: 'content1' });
      cache.set('key2', { type: 'svg', content: 'content2' });
      cache.set('key3', { type: 'svg', content: 'content3' });
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      // Adding 4th entry should evict key2 (now oldest)
      cache.set('key4', { type: 'svg', content: 'content4' });
      
      expect(cache.has('key1')).toBe(true); // Still in cache
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should handle updating existing keys without eviction', () => {
      cache.set('key1', { type: 'svg', content: 'content1' });
      cache.set('key2', { type: 'svg', content: 'content2' });
      cache.set('key3', { type: 'svg', content: 'content3' });
      
      // Update key2 with new content
      cache.set('key2', { type: 'svg', content: 'updated2' });
      
      expect(cache.size()).toBe(3); // Size unchanged
      expect(cache.get('key2')?.content).toBe('updated2');
    });

    it('should evict correctly with multiple accesses', () => {
      cache.set('key1', { type: 'svg', content: 'content1' });
      cache.set('key2', { type: 'svg', content: 'content2' });
      cache.set('key3', { type: 'svg', content: 'content3' });
      
      // Access pattern: key1, key3, key1
      cache.get('key1');
      cache.get('key3');
      cache.get('key1');
      
      // key2 is least recently used, should be evicted
      cache.set('key4', { type: 'svg', content: 'content4' });
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });
  });

  describe('Cache key generation', () => {
    it('should generate consistent keys for same input', () => {
      const filePath = 'test.mmd';
      const content = 'graph TD\n  A-->B';
      
      const key1 = RenderCache.generateKey(filePath, content);
      const key2 = RenderCache.generateKey(filePath, content);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different content', () => {
      const filePath = 'test.mmd';
      const content1 = 'graph TD\n  A-->B';
      const content2 = 'graph TD\n  A-->C';
      
      const key1 = RenderCache.generateKey(filePath, content1);
      const key2 = RenderCache.generateKey(filePath, content2);
      
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different file paths', () => {
      const content = 'graph TD\n  A-->B';
      
      const key1 = RenderCache.generateKey('test1.mmd', content);
      const key2 = RenderCache.generateKey('test2.mmd', content);
      
      expect(key1).not.toBe(key2);
    });

    it('should include file path and hash in key format', () => {
      const filePath = 'test.mmd';
      const content = 'graph TD\n  A-->B';
      
      const key = RenderCache.generateKey(filePath, content);
      
      expect(key).toContain(filePath);
      expect(key).toContain(':');
      expect(key.split(':').length).toBe(2);
    });

    it('should generate SHA-256 hash (64 hex characters)', () => {
      const key = RenderCache.generateKey('test.mmd', 'content');
      const hash = key.split(':')[1];
      
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true); // Only hex characters
    });
  });

  describe('Edge cases', () => {
    it('should handle empty cache', () => {
      expect(cache.size()).toBe(0);
      expect(cache.get('any')).toBeUndefined();
      cache.clear(); // Should not throw
      expect(cache.size()).toBe(0);
    });

    it('should handle cache size of 1', () => {
      const smallCache = new RenderCache(1);
      
      smallCache.set('key1', { type: 'svg', content: 'content1' });
      expect(smallCache.size()).toBe(1);
      
      smallCache.set('key2', { type: 'svg', content: 'content2' });
      expect(smallCache.size()).toBe(1);
      expect(smallCache.has('key1')).toBe(false);
      expect(smallCache.has('key2')).toBe(true);
    });

    it('should handle error results', () => {
      const errorResult: RenderResult = {
        type: 'error',
        content: '',
        error: 'Syntax error on line 5',
      };
      
      cache.set('error-key', errorResult);
      const retrieved = cache.get('error-key');
      
      expect(retrieved).toEqual(errorResult);
      expect(retrieved?.type).toBe('error');
      expect(retrieved?.error).toBe('Syntax error on line 5');
    });

    it('should handle large content in hash generation', () => {
      const largeContent = 'A'.repeat(100000); // 100KB of content
      const key = RenderCache.generateKey('large.mmd', largeContent);
      
      expect(key).toBeDefined();
      expect(key.split(':')[1].length).toBe(64); // Hash is still 64 chars
    });

    it('should handle special characters in file paths', () => {
      const specialPaths = [
        'path/with spaces/file.mmd',
        'path\\with\\backslashes\\file.mmd',
        'path/with-dashes_and_underscores.mmd',
        'path/with.dots.in.name.mmd',
      ];
      
      specialPaths.forEach(path => {
        const key = RenderCache.generateKey(path, 'content');
        expect(key).toContain(path);
        expect(key.split(':').length).toBe(2);
      });
    });
  });

  describe('Cache size configuration', () => {
    it('should respect configured maxSize', () => {
      const customCache = new RenderCache(5);
      
      for (let i = 1; i <= 5; i++) {
        customCache.set(`key${i}`, { type: 'svg', content: `content${i}` });
      }
      
      expect(customCache.size()).toBe(5);
      
      customCache.set('key6', { type: 'svg', content: 'content6' });
      
      expect(customCache.size()).toBe(5); // Still at max
      expect(customCache.has('key1')).toBe(false); // Oldest evicted
    });

    it('should use default maxSize of 50', () => {
      const defaultCache = new RenderCache();
      
      for (let i = 1; i <= 50; i++) {
        defaultCache.set(`key${i}`, { type: 'svg', content: `content${i}` });
      }
      
      expect(defaultCache.size()).toBe(50);
      
      defaultCache.set('key51', { type: 'svg', content: 'content51' });
      
      expect(defaultCache.size()).toBe(50);
      expect(defaultCache.has('key1')).toBe(false);
    });
  });
});
