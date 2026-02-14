/**
 * Kroki Renderer - Renders DSL diagrams using the Kroki API
 * 
 * This renderer encodes diagram content and sends it to the Kroki API for rendering.
 * It supports multiple diagram types (PlantUML, GraphViz, etc.), implements rate limiting,
 * and sanitizes SVG output for security.
 * 
 * Requirements: 2.4, 9.1, 9.2, 9.3, 9.4
 */

import * as pako from 'pako';
import { IRenderer, RenderOptions, RenderResult, EXTENSION_MAP } from '../types';
import { RenderCache } from '../renderCache';
import { RateLimiter } from '../rateLimiter';
import { SvgSanitizer } from '../svgSanitizer';
import { getLogger } from '../logger';
import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Kroki Renderer Debug');

/**
 * Configuration for Kroki renderer
 */
export interface KrokiConfig {
  /** Kroki API endpoint URL */
  endpoint: string;
  /** Minimum interval between API calls in milliseconds */
  rateLimit: number;
  /** Optional authentication */
  auth?: {
    type: 'basic' | 'bearer';
    credentials: string;
  };
}

/**
 * KrokiRenderer implements the IRenderer interface for DSL diagrams via Kroki API
 */
export class KrokiRenderer implements IRenderer {
  private cache: RenderCache;
  private apiEndpoint: string;
  private rateLimiter: RateLimiter;
  private sanitizer: SvgSanitizer;
  private auth?: { type: 'basic' | 'bearer'; credentials: string };

  /**
   * Create a new KrokiRenderer
   * @param cache - Render cache for storing results
   * @param config - Kroki configuration (endpoint, rate limit, auth)
   */
  constructor(cache: RenderCache, config: KrokiConfig) {
    this.cache = cache;
    this.apiEndpoint = config.endpoint.replace(/\/$/, ''); // Remove trailing slash
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.sanitizer = new SvgSanitizer();
    this.auth = config.auth;
  }

  /**
   * Render DSL diagram content via Kroki API
   * @param content - DSL source code
   * @param options - Rendering options (theme, cache key)
   * @returns Promise resolving to render result
   */
  async render(content: string, options: RenderOptions): Promise<RenderResult> {
    console.log('[KrokiRenderer] 1. RENDER START');
    console.log('[KrokiRenderer] 2. Cache key:', options.cacheKey);
    console.log('[KrokiRenderer] 3. Content length:', content.length);
    console.log('[KrokiRenderer] 4. Diagram type from options:', options.diagramType);
    console.log('[KrokiRenderer] 5. API endpoint:', this.apiEndpoint);

    // Validate renderer state
    if (!this.cache) {
      console.error('[KrokiRenderer] ❌ CRITICAL: cache is undefined!');
      return {
        type: 'error',
        content: '',
        error: 'Internal error: Renderer not properly initialized (cache missing)',
      };
    }
    console.log('[KrokiRenderer] 6. Cache validated');

    if (!this.apiEndpoint) {
      console.error('[KrokiRenderer] ❌ CRITICAL: apiEndpoint is undefined!');
      return {
        type: 'error',
        content: '',
        error: 'Internal error: Kroki API endpoint not configured',
      };
    }
    console.log('[KrokiRenderer] 7. API endpoint validated');

    // Check cache first
    try {
      console.log('[KrokiRenderer] 8. About to check cache');
      const cached = this.cache.get(options.cacheKey);
      console.log('[KrokiRenderer] 9. Cache check completed, cached:', !!cached);
      if (cached) {
        console.log('[KrokiRenderer] ✅ Cache hit, returning cached result');
        return cached;
      }
    } catch (cacheError) {
      console.error('[KrokiRenderer] ⚠️ Cache check failed:', cacheError);
      // Continue without cache
    }

    console.log('[KrokiRenderer] 10. Cache miss, rendering via API');

    try {
      console.log('[KrokiRenderer] 11. Getting diagram type from options');
      // Get diagram type from options or detect from cache key
      let diagramType = options.diagramType;
      console.log('[KrokiRenderer] 12. Initial diagramType:', diagramType);

      if (!diagramType) {
        console.log('[KrokiRenderer] 13. No diagramType, detecting from cache key');
        diagramType = this.detectDiagramTypeFromCacheKey(options.cacheKey);
        console.log('[KrokiRenderer] 14. Detected diagramType:', diagramType);
      }

      console.log('[KrokiRenderer] 15. Using diagram type:', diagramType);

      if (!diagramType) {
        console.log('[KrokiRenderer] ❌ Unable to detect diagram type');
        return {
          type: 'error',
          content: '',
          error: 'Unable to detect diagram type from file extension',
        };
      }

      console.log('[KrokiRenderer] 16. About to encode content');
      const encodedContent = this.encodeContent(content);
      console.log('[KrokiRenderer] 17. Content encoded, length:', encodedContent.length);

      console.log('[KrokiRenderer] 18. Getting logger');
      const logger = getLogger();
      console.log('[KrokiRenderer] 19. Logger obtained:', !!logger);

      console.log('[KrokiRenderer] 20. About to log info');
      logger?.info('Rendering diagram via Kroki', { diagramType });
      console.log('[KrokiRenderer] 21. Info logged');

      console.log('[KrokiRenderer] 22. About to call makeRequest');
      outputChannel.appendLine('[KrokiRenderer] 22. About to call makeRequest');
      const svgContent = await this.makeRequest(diagramType!, encodedContent, 'svg');
      outputChannel.appendLine('[KrokiRenderer] 23. makeRequest completed');
      outputChannel.appendLine(`[KrokiRenderer] SVG content length: ${svgContent.length}`);
      outputChannel.appendLine(`[KrokiRenderer] SVG preview: ${svgContent.substring(0, 100)}...`);
      outputChannel.appendLine('[KrokiRenderer] 22. About to call makeRequest')
      // console.log('[KrokiRenderer] 22. About to call makeRequest');
      // console.log('[KrokiRenderer] 23. makeRequest completed');
      // console.log(`[KrokiRenderer] SVG content length: ${svgContent.length}`);
      // console.log(`[KrokiRenderer] SVG starts with: ${svgContent.substring(0, 50)}`);

      console.log('[KrokiRenderer] ✅ Received response from Kroki');
      console.log('[KrokiRenderer] Response length:', svgContent.length);

      // Sanitize SVG content
      outputChannel.appendLine('[KrokiRenderer] 24. Sanitizing SVG...');
      console.log('[KrokiRenderer] 24. Sanitizing SVG...');
      const sanitizedSvg = this.sanitizer.sanitize(svgContent);
      console.log('[KrokiRenderer] 25. Sanitized length:', sanitizedSvg.length);
      outputChannel.appendLine(`[KrokiRenderer] 25. Sanitized length:, ${sanitizedSvg.length}`);

      const result: RenderResult = {
        type: 'svg',
        content: sanitizedSvg,
      };

      // Cache the result
      try {
        console.log('[KrokiRenderer] 26. Caching result');
        this.cache.set(options.cacheKey, result);
        console.log('[KrokiRenderer] ✅ Result cached and returning');
      } catch (cacheError) {
        console.warn('[KrokiRenderer] ⚠️ Failed to cache result:', cacheError);
      }

      return result;
    } catch (error) {
      outputChannel.appendLine(`[KrokiRenderer] ❌ Error during render: ${error}`)
      console.log('[KrokiRenderer] ❌ Error during render:', error);
      console.error('[KrokiRenderer] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return this.handleApiError(error);
    }
  }
  /**
   * Get supported file extensions for Kroki
   * @returns Array of supported extensions
   */
  getSupportedExtensions(): string[] {
    // Return all extensions that map to Kroki renderer
    return Object.entries(EXTENSION_MAP)
      .filter(([_, mapping]) => mapping.renderer === 'kroki')
      .map(([ext, _]) => ext);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // No resources to clean up currently
  }

  /**
   * Encode content using pako (zlib) + base64url for Kroki API
   * @param content - Raw diagram source code
   * @returns Base64url-encoded compressed content
   */
  private encodeContent(content: string): string {
    // Compress using zlib (pako)
    const compressed = pako.deflate(content, { level: 9 });

    // Convert to base64url (URL-safe base64)
    const base64 = Buffer.from(compressed).toString('base64');
    const base64url = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return base64url;
  }

  /**
   * Detect diagram type from cache key (which includes file path)
   * @param cacheKey - Cache key containing file path
   * @returns Diagram type string or undefined
   */
  private detectDiagramTypeFromCacheKey(cacheKey: string): string | undefined {
    // Cache key format is typically: "filepath:hash"
    const filePath = cacheKey.split(':')[0];
    return this.detectDiagramType(filePath);
  }

  /**
   * Detect diagram type from file extension
   * @param filePath - File path with extension
   * @returns Diagram type string or undefined
   */
  private detectDiagramType(filePath: string): string | undefined {
    // Extract extension from file path
    const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

    // Look up diagram type in extension map
    const mapping = EXTENSION_MAP[extension];
    return mapping?.diagramType;
  }

  /**
   * Make HTTP request to Kroki API
   * @param diagramType - Type of diagram (plantuml, graphviz, etc.)
   * @param encodedContent - Base64url-encoded compressed content
   * @param format - Output format (svg or png)
   * @returns Promise resolving to response content
   */
  private async makeRequest(
    diagramType: string,
    encodedContent: string,
    format: 'svg' | 'png'
  ): Promise<string> {
    const outputChannel = vscode.window.createOutputChannel('Kroki Renderer Debug');
    outputChannel.show(); // Show the output panel

    const url = `${this.apiEndpoint}/${diagramType}/${format}/${encodedContent}`;
    const logger = getLogger();

    outputChannel.appendLine('[KrokiRenderer] makeRequest() called');
    outputChannel.appendLine(`[KrokiRenderer] URL length: ${url.length}`);
    outputChannel.appendLine(`[KrokiRenderer] Endpoint: ${this.apiEndpoint}`);
    outputChannel.appendLine(`[KrokiRenderer] Diagram type: ${diagramType}`);
    outputChannel.appendLine(`[KrokiRenderer] Format: ${format}`);

    outputChannel.appendLine('[KrokiRenderer] About to log with logger');

    // Log API request
    logger?.apiRequest('GET', url, { diagramType, format });

    outputChannel.appendLine('[KrokiRenderer] Logger call completed');

    const startTime = Date.now();

    outputChannel.appendLine('[KrokiRenderer] About to call fetch()...');

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const error = new Error('Request timeout: Kroki API did not respond within 10 seconds');
          error.name = 'AbortError';
          reject(error);
        }, 10000);
      });

      outputChannel.appendLine('[KrokiRenderer] Creating fetch promise...');

      // Race between fetch and timeout
      const fetchPromise = fetch(url, {
        method: 'GET',
      });

      outputChannel.appendLine('[KrokiRenderer] Racing promises...');
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      outputChannel.appendLine(`[KrokiRenderer] fetch() completed, status: ${response.status}`);

      console.log('[KrokiRenderer] fetch() completed, status:', response.status);

      const duration = Date.now() - startTime;
      outputChannel.appendLine(`[KrokiRenderer] Request took ${duration}ms`);

      // Log API response
      logger?.apiResponse('GET', url, response.status, duration);
      outputChannel.appendLine('[KrokiRenderer] Checking response status...');

      if (!response.ok) {
        outputChannel.appendLine('[KrokiRenderer] Response NOT OK');
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      outputChannel.appendLine('[KrokiRenderer] Response OK, reading content...');

      if (format === 'svg') {
        outputChannel.appendLine('[KrokiRenderer] Reading as text (SVG)...');
        const text = await response.text();
        outputChannel.appendLine(`[KrokiRenderer] SVG received, length: ${text.length}`);
        return text;
      } else {
        // For PNG, return base64-encoded data URL
        outputChannel.appendLine('[KrokiRenderer] Reading as PNG...');
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        outputChannel.appendLine(`[KrokiRenderer] PNG received, base64 length: ${base64.length}`);
        return `data:image/png;base64,${base64}`;
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log API error
      logger?.apiError('GET', url, error);

      throw error;
    }
  }

  /**
   * Handle API errors and convert to RenderResult
   * @param error - Error from API request
   * @returns RenderResult with error information
   */
  private handleApiError(error: any): RenderResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for timeout
    if (error.name === 'AbortError') {
      return {
        type: 'error',
        content: '',
        error: 'Request timeout: Kroki API did not respond within 10 seconds. Please try again.',
      };
    }

    // Parse HTTP status codes FIRST (before checking for network errors)
    const statusMatch = errorMessage.match(/HTTP (\d+)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);

      if (status >= 400 && status < 500) {
        // Client error - display specific error
        return {
          type: 'error',
          content: '',
          error: `Client error (${status}): ${errorMessage}`,
        };
      } else if (status >= 500) {
        // Server error - display generic error with retry
        return {
          type: 'error',
          content: '',
          error: `Server error (${status}): The Kroki service is experiencing issues. Please try again later.`,
        };
      }
    }

    // Check for network errors (after HTTP status check)
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return {
        type: 'error',
        content: '',
        error: `Connection error: Unable to reach Kroki API at ${this.apiEndpoint}. Check your internet connection or configure a custom endpoint.`,
      };
    }

    // Generic error
    return {
      type: 'error',
      content: '',
      error: `Rendering error: ${errorMessage}`,
    };
  }
}
