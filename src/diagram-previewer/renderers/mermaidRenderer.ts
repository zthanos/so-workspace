/**
 * Mermaid Renderer - Renders Mermaid diagrams using mermaidjs in webview
 * 
 * This renderer loads mermaid from CDN in the webview and renders diagrams there.
 * The webview provides the DOM environment that mermaid requires.
 * 
 * Requirements: 1.3, 1.5, 8.1, 8.2, 8.4
 */

import * as vscode from 'vscode';
import { IRenderer, RenderOptions, RenderResult } from '../types';
import { RenderCache } from '../renderCache';
import { ThemeManager } from '../themeManager';

/**
 * MermaidRenderer implements the IRenderer interface for Mermaid diagrams
 */
export class MermaidRenderer implements IRenderer {
  private cache: RenderCache;
  private themeChangeDisposable: vscode.Disposable | undefined;

  /**
   * Create a new MermaidRenderer
   * @param webview - VSCode webview instance (not used directly, mermaid loads in webview HTML)
   * @param cache - Render cache for storing results
   */
  constructor(webview: vscode.Webview, cache: RenderCache) {
    this.cache = cache;
  }

  /**
   * Render Mermaid diagram content
   * The actual rendering happens in the webview via the HTML/JS
   * This method just returns the content to be rendered
   * 
   * @param content - Mermaid source code
   * @param options - Rendering options (theme, cache key)
   * @returns Promise resolving to render result
   */
  async render(content: string, options: RenderOptions): Promise<RenderResult> {
    // Check cache first
    const cached = this.cache.get(options.cacheKey);
    if (cached) {
      return cached;
    }

    // For mermaid, we return the content as-is
    // The webview will handle the actual rendering using mermaid loaded from CDN
    const result: RenderResult = {
      type: 'svg',
      content: content, // Return raw mermaid content
    };

    // Don't cache yet - caching happens after successful webview render
    return result;
  }

  /**
   * Get supported file extensions for Mermaid
   * @returns Array of supported extensions
   */
  getSupportedExtensions(): string[] {
    return ['.mmd', '.mermaid'];
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Unregister theme change listener
    if (this.themeChangeDisposable) {
      this.themeChangeDisposable.dispose();
      this.themeChangeDisposable = undefined;
    }
  }

  /**
   * Register with a ThemeManager to receive theme change notifications
   * @param themeManager - ThemeManager instance to register with
   */
  registerThemeManager(themeManager: ThemeManager): void {
    // Unregister previous listener if any
    if (this.themeChangeDisposable) {
      this.themeChangeDisposable.dispose();
    }

    // Register for theme change notifications
    this.themeChangeDisposable = themeManager.onThemeChange(async (theme) => {
      await this.handleThemeChange(theme);
    });
  }

  /**
   * Handle theme changes from VSCode
   * @param theme - New theme (light or dark)
   */
  async handleThemeChange(theme: 'light' | 'dark'): Promise<void> {
    // Clear cache to force re-render with new theme
    this.cache.clear();
  }
}
