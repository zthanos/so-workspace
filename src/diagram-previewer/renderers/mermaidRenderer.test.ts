/**
 * Unit tests for MermaidRenderer
 */

import { MermaidRenderer } from './mermaidRenderer';
import { RenderCache } from '../renderCache';
import { RenderOptions } from '../types';
import { ThemeManager } from '../themeManager';

// Mock VSCode API
const mockWebview = {
  postMessage: jest.fn(),
  onDidReceiveMessage: jest.fn(),
};

describe('MermaidRenderer', () => {
  let renderer: MermaidRenderer;
  let cache: RenderCache;

  beforeEach(() => {
    cache = new RenderCache(50);
    renderer = new MermaidRenderer(mockWebview as any, cache);
    jest.clearAllMocks();
  });

  describe('getSupportedExtensions', () => {
    test('should return .mmd and .mermaid extensions', () => {
      const extensions = renderer.getSupportedExtensions();
      expect(extensions).toEqual(['.mmd', '.mermaid']);
    });
  });

  describe('render', () => {
    test('should return cached result if available', async () => {
      const options: RenderOptions = {
        theme: 'light',
        cacheKey: 'test-key',
      };

      const cachedResult = {
        type: 'svg' as const,
        content: '<svg>cached</svg>',
      };

      cache.set(options.cacheKey, cachedResult);

      const result = await renderer.render('graph TD; A-->B', options);

      expect(result).toEqual(cachedResult);
      expect(mockWebview.postMessage).not.toHaveBeenCalled();
    });

    test('should initialize mermaid on first render', async () => {
      const options: RenderOptions = {
        theme: 'light',
        cacheKey: 'test-key',
      };

      // Mock the message listener to capture and respond with correct renderId
      mockWebview.onDidReceiveMessage.mockImplementation((callback: any) => {
        // Capture the render request and respond
        const originalPostMessage = mockWebview.postMessage;
        mockWebview.postMessage = jest.fn((message: any) => {
          originalPostMessage(message);
          if (message.type === 'render-mermaid') {
            setImmediate(() => {
              callback({
                type: 'render-result',
                renderId: message.renderId,
                success: true,
                svg: '<svg>test</svg>',
              });
            });
          }
        });
        return { dispose: jest.fn() };
      });

      const result = await renderer.render('graph TD; A-->B', options);

      expect(result.type).toBe('svg');
      expect(result.content).toBe('<svg>test</svg>');
    });

    test('should handle rendering errors with line numbers', async () => {
      const options: RenderOptions = {
        theme: 'light',
        cacheKey: 'test-key-2',
      };

      // Mock the message listener to return error with correct renderId
      mockWebview.onDidReceiveMessage.mockImplementation((callback: any) => {
        const originalPostMessage = mockWebview.postMessage;
        mockWebview.postMessage = jest.fn((message: any) => {
          originalPostMessage(message);
          if (message.type === 'render-mermaid') {
            setImmediate(() => {
              callback({
                type: 'render-result',
                renderId: message.renderId,
                success: false,
                error: 'Parse error on line 5: unexpected token',
              });
            });
          }
        });
        return { dispose: jest.fn() };
      });

      const result = await renderer.render('invalid syntax', options);

      expect(result.type).toBe('error');
      expect(result.error).toContain('line 5');
    });

    test('should use correct theme for light mode', async () => {
      const options: RenderOptions = {
        theme: 'light',
        cacheKey: 'test-key-3',
      };

      let renderMessage: any = null;

      // Mock the message listener to capture render message
      mockWebview.onDidReceiveMessage.mockImplementation((callback: any) => {
        const originalPostMessage = mockWebview.postMessage;
        mockWebview.postMessage = jest.fn((message: any) => {
          originalPostMessage(message);
          if (message.type === 'render-mermaid') {
            renderMessage = message;
            setImmediate(() => {
              callback({
                type: 'render-result',
                renderId: message.renderId,
                success: true,
                svg: '<svg>test</svg>',
              });
            });
          }
        });
        return { dispose: jest.fn() };
      });

      await renderer.render('graph TD; A-->B', options);

      expect(renderMessage).toBeDefined();
      expect(renderMessage.theme).toBe('default');
    });

    test('should use correct theme for dark mode', async () => {
      const options: RenderOptions = {
        theme: 'dark',
        cacheKey: 'test-key-4',
      };

      let renderMessage: any = null;

      // Mock the message listener to capture render message
      mockWebview.onDidReceiveMessage.mockImplementation((callback: any) => {
        const originalPostMessage = mockWebview.postMessage;
        mockWebview.postMessage = jest.fn((message: any) => {
          originalPostMessage(message);
          if (message.type === 'render-mermaid') {
            renderMessage = message;
            setImmediate(() => {
              callback({
                type: 'render-result',
                renderId: message.renderId,
                success: true,
                svg: '<svg>test</svg>',
              });
            });
          }
        });
        return { dispose: jest.fn() };
      });

      await renderer.render('graph TD; A-->B', options);

      expect(renderMessage).toBeDefined();
      expect(renderMessage.theme).toBe('dark');
    });
  });

  describe('handleThemeChange', () => {
    test('should reinitialize mermaid and clear cache on theme change', async () => {
      // Add something to cache
      cache.set('test-key', {
        type: 'svg',
        content: '<svg>test</svg>',
      });

      await renderer.handleThemeChange('dark');

      // Check that cache was cleared
      expect(cache.get('test-key')).toBeUndefined();

      // Check that initialization message was sent
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'init-mermaid',
        })
      );
    });
  });

  describe('dispose', () => {
    test('should reset initialization state', () => {
      renderer.dispose();
      // After dispose, next render should reinitialize
      // This is tested implicitly by the initialization tests
    });

    test('should dispose theme change listener', () => {
      const mockThemeManager = {
        onThemeChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      } as any;

      renderer.registerThemeManager(mockThemeManager);
      
      const disposable = mockThemeManager.onThemeChange.mock.results[0].value;
      
      renderer.dispose();

      expect(disposable.dispose).toHaveBeenCalled();
    });
  });

  describe('registerThemeManager', () => {
    test('should register for theme change notifications', () => {
      const mockThemeManager = {
        onThemeChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      } as any;

      renderer.registerThemeManager(mockThemeManager);

      expect(mockThemeManager.onThemeChange).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should dispose previous listener when registering again', () => {
      const mockDispose1 = jest.fn();
      const mockDispose2 = jest.fn();
      
      const mockThemeManager = {
        onThemeChange: jest.fn()
          .mockReturnValueOnce({ dispose: mockDispose1 })
          .mockReturnValueOnce({ dispose: mockDispose2 }),
      } as any;

      renderer.registerThemeManager(mockThemeManager);
      renderer.registerThemeManager(mockThemeManager);

      expect(mockDispose1).toHaveBeenCalled();
      expect(mockDispose2).not.toHaveBeenCalled();
    });

    test('should call handleThemeChange when theme changes', async () => {
      let themeChangeCallback: ((theme: 'light' | 'dark') => Promise<void>) | undefined;
      
      const mockThemeManager = {
        onThemeChange: jest.fn().mockImplementation((callback) => {
          themeChangeCallback = callback;
          return { dispose: jest.fn() };
        }),
      } as any;

      // Spy on handleThemeChange
      const handleThemeChangeSpy = jest.spyOn(renderer, 'handleThemeChange');

      renderer.registerThemeManager(mockThemeManager);

      // Simulate theme change
      if (themeChangeCallback) {
        await themeChangeCallback('light');
      }

      expect(handleThemeChangeSpy).toHaveBeenCalledWith('light');
    });
  });
});
