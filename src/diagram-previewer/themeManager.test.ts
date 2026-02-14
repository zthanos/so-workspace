/**
 * Unit tests for ThemeManager
 */

// Mock vscode module BEFORE importing anything else
jest.mock('vscode', () => ({
  window: {
    activeColorTheme: {
      kind: 2, // Dark theme
    },
    onDidChangeActiveColorTheme: jest.fn(),
  },
  ColorThemeKind: {
    Light: 1,
    Dark: 2,
    HighContrast: 3,
    HighContrastLight: 4,
  },
}), { virtual: true });

import { ThemeManager } from './themeManager';
import * as vscode from 'vscode';

describe('ThemeManager', () => {
  let themeManager: ThemeManager;
  let mockOnDidChangeActiveColorTheme: jest.Mock;

  beforeEach(() => {
    // Reset the mock theme to dark before each test
    (vscode.window.activeColorTheme as any).kind = vscode.ColorThemeKind.Dark;
    
    mockOnDidChangeActiveColorTheme = vscode.window.onDidChangeActiveColorTheme as jest.Mock;
    mockOnDidChangeActiveColorTheme.mockClear();
    mockOnDidChangeActiveColorTheme.mockReturnValue({ dispose: jest.fn() });

    themeManager = new ThemeManager();
  });

  afterEach(() => {
    themeManager.dispose();
  });

  describe('getCurrentTheme', () => {
    it('should detect current theme on initialization', () => {
      const theme = themeManager.getCurrentTheme();
      expect(theme).toBe('dark'); // Based on mock
    });

    it('should detect light theme', () => {
      (vscode.window.activeColorTheme as any).kind = vscode.ColorThemeKind.Light;
      const newManager = new ThemeManager();
      expect(newManager.getCurrentTheme()).toBe('light');
      newManager.dispose();
    });

    it('should detect high contrast as dark theme', () => {
      (vscode.window.activeColorTheme as any).kind = vscode.ColorThemeKind.HighContrast;
      const newManager = new ThemeManager();
      expect(newManager.getCurrentTheme()).toBe('dark');
      newManager.dispose();
    });

    it('should detect high contrast light as light theme', () => {
      (vscode.window.activeColorTheme as any).kind = vscode.ColorThemeKind.HighContrastLight;
      const newManager = new ThemeManager();
      expect(newManager.getCurrentTheme()).toBe('light');
      newManager.dispose();
    });
  });

  describe('start and stop', () => {
    it('should register theme change listener when started', () => {
      themeManager.start();
      expect(mockOnDidChangeActiveColorTheme).toHaveBeenCalledTimes(1);
    });

    it('should not register multiple listeners if started twice', () => {
      themeManager.start();
      themeManager.start();
      expect(mockOnDidChangeActiveColorTheme).toHaveBeenCalledTimes(1);
    });

    it('should dispose listener when stopped', () => {
      const mockDispose = jest.fn();
      mockOnDidChangeActiveColorTheme.mockReturnValue({ dispose: mockDispose });

      themeManager.start();
      themeManager.stop();

      expect(mockDispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('onThemeChange', () => {
    it('should register callback and return disposable', () => {
      const callback = jest.fn();
      const disposable = themeManager.onThemeChange(callback);

      expect(disposable).toHaveProperty('dispose');
      expect(typeof disposable.dispose).toBe('function');
    });

    it('should call callback when theme changes', async () => {
      const callback = jest.fn();
      let themeChangeHandler: ((theme: vscode.ColorTheme) => void) | undefined;

      // Start with dark theme (from mock)
      mockOnDidChangeActiveColorTheme.mockImplementation((handler) => {
        themeChangeHandler = handler;
        return { dispose: jest.fn() };
      });

      themeManager.start();
      themeManager.onThemeChange(callback);

      // Simulate theme change to light (different from initial dark)
      if (themeChangeHandler) {
        themeChangeHandler({ kind: vscode.ColorThemeKind.Light } as vscode.ColorTheme);
      }

      // Wait for async callbacks
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith('light');
    });

    it('should not call callback if theme type does not change', async () => {
      const callback = jest.fn();
      let themeChangeHandler: ((theme: vscode.ColorTheme) => void) | undefined;

      // Start with dark theme (from mock)
      mockOnDidChangeActiveColorTheme.mockImplementation((handler) => {
        themeChangeHandler = handler;
        return { dispose: jest.fn() };
      });

      themeManager.start();
      themeManager.onThemeChange(callback);

      // Simulate theme change to dark (same as initial)
      if (themeChangeHandler) {
        themeChangeHandler({ kind: vscode.ColorThemeKind.Dark } as vscode.ColorTheme);
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support async callbacks', async () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      let themeChangeHandler: ((theme: vscode.ColorTheme) => void) | undefined;

      // Start with dark theme (from mock)
      mockOnDidChangeActiveColorTheme.mockImplementation((handler) => {
        themeChangeHandler = handler;
        return { dispose: jest.fn() };
      });

      themeManager.start();
      themeManager.onThemeChange(callback);

      // Change to light theme
      if (themeChangeHandler) {
        themeChangeHandler({ kind: vscode.ColorThemeKind.Light } as vscode.ColorTheme);
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith('light');
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const successCallback = jest.fn();
      let themeChangeHandler: ((theme: vscode.ColorTheme) => void) | undefined;

      // Start with dark theme (from mock)
      mockOnDidChangeActiveColorTheme.mockImplementation((handler) => {
        themeChangeHandler = handler;
        return { dispose: jest.fn() };
      });

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      themeManager.start();
      themeManager.onThemeChange(errorCallback);
      themeManager.onThemeChange(successCallback);

      // Change to light theme
      if (themeChangeHandler) {
        themeChangeHandler({ kind: vscode.ColorThemeKind.Light } as vscode.ColorTheme);
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should unregister callback when disposable is disposed', async () => {
      const callback = jest.fn();
      let themeChangeHandler: ((theme: vscode.ColorTheme) => void) | undefined;

      mockOnDidChangeActiveColorTheme.mockImplementation((handler) => {
        themeChangeHandler = handler;
        return { dispose: jest.fn() };
      });

      themeManager.start();
      const disposable = themeManager.onThemeChange(callback);

      // Dispose the callback
      disposable.dispose();

      // Simulate theme change
      if (themeChangeHandler) {
        themeChangeHandler({ kind: vscode.ColorThemeKind.Light } as vscode.ColorTheme);
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should stop listening and clear callbacks', () => {
      const mockDispose = jest.fn();
      mockOnDidChangeActiveColorTheme.mockReturnValue({ dispose: mockDispose });

      const callback = jest.fn();
      themeManager.start();
      themeManager.onThemeChange(callback);

      themeManager.dispose();

      expect(mockDispose).toHaveBeenCalledTimes(1);
    });
  });
});
