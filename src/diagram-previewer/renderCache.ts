/**
 * RenderCache - LRU cache for rendered diagrams
 * 
 * Caches rendered diagram results to avoid redundant rendering operations.
 * Uses Least Recently Used (LRU) eviction policy when cache size limit is exceeded.
 * 
 * Requirements: 5.5, 5.6, 7.4
 */

import * as crypto from 'crypto';
import { RenderResult, CacheEntry } from './types';

/**
 * LRU cache for storing rendered diagram results
 */
export class RenderCache {
  private cache: Map<string, CacheEntry>;
  private accessOrder: string[];
  private maxSize: number;

  /**
   * Creates a new RenderCache instance
   * @param maxSize - Maximum number of entries to store (default: 50)
   */
  constructor(maxSize: number = 50) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = maxSize;
  }

  /**
   * Retrieves a cached render result
   * Updates access order for LRU tracking
   * 
   * @param key - Cache key (generated from file path + content hash)
   * @returns Cached render result or undefined if not found
   */
  get(key: string): RenderResult | undefined {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Update access order - move to end (most recently used)
      this.updateAccessOrder(key);
      return entry.result;
    }
    
    return undefined;
  }

  /**
   * Stores a render result in the cache
   * Evicts oldest entry if cache size limit is exceeded
   * 
   * @param key - Cache key (generated from file path + content hash)
   * @param result - Render result to cache
   */
  set(key: string, result: RenderResult): void {
    // If key already exists, remove it from access order
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Add new entry
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
    
    // Add to end of access order (most recently used)
    this.accessOrder.push(key);

    // Evict oldest if over size limit
    if (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Clears all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Gets the current number of cached entries
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Checks if a key exists in the cache
   * @param key - Cache key to check
   * @returns True if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Generates a cache key from file path and content
   * Uses SHA-256 hash of content for uniqueness
   * 
   * @param filePath - Path to the diagram file
   * @param content - Diagram source content
   * @returns Cache key in format: filePath:contentHash
   */
  static generateKey(filePath: string, content: string): string {
    const contentHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
    
    return `${filePath}:${contentHash}`;
  }

  /**
   * Evicts the least recently used entry from the cache
   * @private
   */
  private evictOldest(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    // Remove the first entry (least recently used)
    const oldestKey = this.accessOrder.shift();
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Updates the access order for a key (moves to end)
   * @private
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Removes a key from the access order array
   * @private
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}
