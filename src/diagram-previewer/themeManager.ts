/**
 * Theme Manager - Manages VSCode theme changes and notifies renderers
 * 
 * This module listens to VSCode theme change events and provides a way
 * for renderers to be notified when the theme changes.
 * 
 * Requirements: 8.5
 */

import * as vscode from 'vscode';

/**
 * Callback function type for theme change notifications
 */
export type ThemeChangeCallback = (theme: 'light' | 'dark') => void | Promise<void>;

/**
 * ThemeManager handles VSCode theme changes and notifies registered callbacks
 */
export class ThemeManager {
  private callbacks: Set<ThemeChangeCallback> = new Set();
  private disposable: vscode.Disposable | undefined;
  private currentTheme: 'light' | 'dark';

  /**
   * Create a new ThemeManager
   */
  constructor() {
    this.currentTheme = this.detectCurrentTheme();
  }

  /**
   * Start listening to theme changes
   */
  start(): void {
    if (this.disposable) {
      return; // Already started
    }

    this.disposable = vscode.window.onDidChangeActiveColorTheme((colorTheme) => {
      const newTheme = this.getThemeType(colorTheme);
      
      // Only notify if theme actually changed
      if (newTheme !== this.currentTheme) {
        this.currentTheme = newTheme;
        this.notifyCallbacks(newTheme);
      }
    });
  }

  /**
   * Stop listening to theme changes
   */
  stop(): void {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = undefined;
    }
  }

  /**
   * Register a callback to be notified of theme changes
   * @param callback - Function to call when theme changes
   * @returns Disposable to unregister the callback
   */
  onThemeChange(callback: ThemeChangeCallback): vscode.Disposable {
    this.callbacks.add(callback);

    return {
      dispose: () => {
        this.callbacks.delete(callback);
      },
    };
  }

  /**
   * Get the current theme
   * @returns Current theme (light or dark)
   */
  getCurrentTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }

  /**
   * Detect the current VSCode theme
   * @returns Current theme type
   */
  private detectCurrentTheme(): 'light' | 'dark' {
    const colorTheme = vscode.window.activeColorTheme;
    return this.getThemeType(colorTheme);
  }

  /**
   * Determine if a color theme is light or dark
   * @param colorTheme - VSCode color theme
   * @returns Theme type (light or dark)
   */
  private getThemeType(colorTheme: vscode.ColorTheme): 'light' | 'dark' {
    // VSCode ColorThemeKind: Light = 1, Dark = 2, HighContrast = 3, HighContrastLight = 4
    switch (colorTheme.kind) {
      case vscode.ColorThemeKind.Light:
      case vscode.ColorThemeKind.HighContrastLight:
        return 'light';
      case vscode.ColorThemeKind.Dark:
      case vscode.ColorThemeKind.HighContrast:
      default:
        return 'dark';
    }
  }

  /**
   * Notify all registered callbacks of theme change
   * @param theme - New theme
   */
  private async notifyCallbacks(theme: 'light' | 'dark'): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const callback of this.callbacks) {
      try {
        const result = callback(theme);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        console.error('Error in theme change callback:', error);
      }
    }

    // Wait for all async callbacks to complete
    if (promises.length > 0) {
      await Promise.all(promises).catch((error) => {
        console.error('Error waiting for theme change callbacks:', error);
      });
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stop();
    this.callbacks.clear();
  }
}
