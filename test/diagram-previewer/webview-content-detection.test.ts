/**
 * Unit tests for webview content detection logic
 * Tests the handleUpdate function's ability to correctly identify SVG vs Mermaid content
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Webview Content Detection', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;
  let diagramContent: HTMLElement;
  let errorContainer: HTMLElement;
  let errorMessage: HTMLElement;
  let loadingIndicator: HTMLElement;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let renderMermaidMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Set up JSDOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="diagram-content"></div>
          <div id="error-container" class="">
            <div id="error-message"></div>
          </div>
          <div id="loading-indicator" class=""></div>
        </body>
      </html>
    `);

    document = dom.window.document;
    window = dom.window as Window & typeof globalThis;
    
    // Get DOM elements
    diagramContent = document.getElementById('diagram-content')!;
    errorContainer = document.getElementById('error-container')!;
    errorMessage = document.getElementById('error-message')!;
    loadingIndicator = document.getElementById('loading-indicator')!;

    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock renderMermaid function
    renderMermaidMock = vi.fn().mockResolvedValue(undefined);

    // Mock window.mermaid
    (window as any).mermaid = {
      render: vi.fn().mockResolvedValue({ svg: '<svg>mermaid rendered</svg>' })
    };
  });

  /**
   * Helper function to simulate handleUpdate logic
   * This replicates the fixed webview logic from main.js
   */
  async function handleUpdate(content: string, format: string) {
    console.log('[Webview] Received update:', { 
      format, 
      contentLength: content?.length, 
      contentPreview: content?.substring(0, 100) 
    });
    
    // Hide loading and error (simplified)
    loadingIndicator.classList.remove('visible');
    errorContainer.classList.remove('visible');

    if (format === 'svg') {
      const trimmedContent = content.trim();
      
      // More robust SVG detection with fallback check
      const startsWithSvg = trimmedContent.startsWith('<svg');
      const startsWithXml = trimmedContent.startsWith('<?xml');
      const containsSvg = trimmedContent.includes('<svg');
      const isSvg = startsWithSvg || startsWithXml || containsSvg;
      
      console.log('[Webview] Content detection:', { 
        isSvg,
        startsWithSvg,
        startsWithXml,
        containsSvg
      });
      
      if (!isSvg) {
        // This is raw mermaid content, render it
        console.log('[Webview] Rendering as Mermaid');
        await renderMermaidMock(content);
      } else {
        // This is already rendered SVG
        console.log('[Webview] Displaying as SVG');
        try {
          diagramContent.innerHTML = content;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[Webview] Failed to insert SVG into DOM:', errorMsg);
          showError(`Failed to display SVG diagram: ${errorMsg}`);
        }
      }
    } else if (format === 'png') {
      console.log('[Webview] Displaying as PNG');
      diagramContent.innerHTML = `<img src="${content}" alt="Diagram" />`;
    }
  }

  function showError(message: string) {
    errorMessage.textContent = message;
    errorContainer.classList.add('visible');
    diagramContent.style.display = 'none';
  }

  describe('SVG Detection Examples (Requirements 1.1, 1.3, 1.4)', () => {
    it('should detect standard SVG content', async () => {
      const svgContent = '<svg width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>';
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify SVG was inserted directly into DOM (contains svg tag)
      expect(diagramContent.innerHTML).toContain('<svg');
      expect(diagramContent.innerHTML).toContain('circle');
      
      // Verify Mermaid rendering was NOT called
      expect(renderMermaidMock).not.toHaveBeenCalled();
      
      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Content detection:',
        expect.objectContaining({
          isSvg: true,
          startsWithSvg: true
        })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Displaying as SVG');
    });

    it('should detect XML-prefixed SVG content', async () => {
      const svgContent = '<?xml version="1.0" encoding="UTF-8"?><svg width="100" height="100"><rect x="10" y="10" width="80" height="80"/></svg>';
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify SVG was inserted directly into DOM (contains svg and rect)
      expect(diagramContent.innerHTML).toContain('<svg');
      expect(diagramContent.innerHTML).toContain('rect');
      
      // Verify Mermaid rendering was NOT called
      expect(renderMermaidMock).not.toHaveBeenCalled();
      
      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Content detection:',
        expect.objectContaining({
          isSvg: true,
          startsWithXml: true
        })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Displaying as SVG');
    });

    it('should detect SVG with leading whitespace', async () => {
      const svgContent = '\n\n  <svg width="100" height="100"><line x1="0" y1="0" x2="100" y2="100"/></svg>';
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify SVG was inserted directly into DOM (contains svg and line)
      expect(diagramContent.innerHTML).toContain('<svg');
      expect(diagramContent.innerHTML).toContain('line');
      
      // Verify Mermaid rendering was NOT called
      expect(renderMermaidMock).not.toHaveBeenCalled();
      
      // Verify logging shows correct detection
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Content detection:',
        expect.objectContaining({
          isSvg: true,
          startsWithSvg: true
        })
      );
    });

    it('should detect SVG with attributes', async () => {
      const svgContent = '<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><polygon points="100,10 40,198 190,78 10,78 160,198"/></svg>';
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify SVG was inserted directly into DOM (contains svg and polygon)
      expect(diagramContent.innerHTML).toContain('<svg');
      expect(diagramContent.innerHTML).toContain('polygon');
      
      // Verify Mermaid rendering was NOT called
      expect(renderMermaidMock).not.toHaveBeenCalled();
      
      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Displaying as SVG');
    });
  });

  describe('Mermaid Detection Examples (Requirement 1.5)', () => {
    it('should detect graph diagram as Mermaid', async () => {
      const mermaidContent = 'graph TD; A-->B';
      
      await handleUpdate(mermaidContent, 'svg');
      
      // Verify Mermaid rendering WAS called
      expect(renderMermaidMock).toHaveBeenCalledWith(mermaidContent);
      
      // Verify SVG was NOT inserted directly
      expect(diagramContent.innerHTML).toBe('');
      
      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Content detection:',
        expect.objectContaining({
          isSvg: false
        })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Rendering as Mermaid');
    });

    it('should detect sequence diagram as Mermaid', async () => {
      const mermaidContent = 'sequenceDiagram; Alice->>Bob: Hello';
      
      await handleUpdate(mermaidContent, 'svg');
      
      // Verify Mermaid rendering WAS called
      expect(renderMermaidMock).toHaveBeenCalledWith(mermaidContent);
      
      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Rendering as Mermaid');
    });

    it('should detect class diagram as Mermaid', async () => {
      const mermaidContent = 'classDiagram; class Animal';
      
      await handleUpdate(mermaidContent, 'svg');
      
      // Verify Mermaid rendering WAS called
      expect(renderMermaidMock).toHaveBeenCalledWith(mermaidContent);
      
      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Rendering as Mermaid');
    });
  });

  describe('Logging Verification (Requirements 2.1, 2.2)', () => {
    it('should log content details on update', async () => {
      const svgContent = '<svg><rect/></svg>';
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify initial logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Received update:',
        expect.objectContaining({
          format: 'svg',
          contentLength: svgContent.length,
          contentPreview: svgContent.substring(0, 100)
        })
      );
    });

    it('should log content detection results', async () => {
      const svgContent = '<?xml version="1.0"?><svg><circle/></svg>';
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify detection logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Content detection:',
        expect.objectContaining({
          isSvg: true,
          startsWithSvg: false,
          startsWithXml: true,
          containsSvg: true
        })
      );
    });

    it('should log rendering path decision', async () => {
      const mermaidContent = 'graph LR; A-->B';
      
      await handleUpdate(mermaidContent, 'svg');
      
      // Verify path logging
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Rendering as Mermaid');
    });

    it('should log SVG display path decision', async () => {
      const svgContent = '<svg><path d="M10 10"/></svg>';
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify path logging
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Displaying as SVG');
    });
  });

  describe('Error Handling (Requirements 3.1, 3.3)', () => {
    it('should display error when DOM insertion fails', async () => {
      const svgContent = '<svg><rect/></svg>';
      
      // Mock innerHTML setter to throw error
      Object.defineProperty(diagramContent, 'innerHTML', {
        set: () => {
          throw new Error('DOM insertion failed');
        },
        configurable: true
      });
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify error was displayed
      expect(errorContainer.classList.contains('visible')).toBe(true);
      expect(errorMessage.textContent).toContain('Failed to display SVG diagram');
      expect(errorMessage.textContent).toContain('DOM insertion failed');
    });

    it('should log error when DOM insertion fails', async () => {
      const svgContent = '<svg><rect/></svg>';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock innerHTML setter to throw error
      Object.defineProperty(diagramContent, 'innerHTML', {
        set: () => {
          throw new Error('DOM insertion failed');
        },
        configurable: true
      });
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Webview] Failed to insert SVG into DOM:',
        'DOM insertion failed'
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle empty content gracefully', async () => {
      const emptyContent = '';
      
      await handleUpdate(emptyContent, 'svg');
      
      // Should not throw error
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Received update:',
        expect.objectContaining({
          format: 'svg',
          contentLength: 0
        })
      );
    });

    it('should handle content without SVG or Mermaid markers', async () => {
      const plainText = 'This is just plain text';
      
      await handleUpdate(plainText, 'svg');
      
      // Should attempt Mermaid rendering (as it's not SVG)
      expect(renderMermaidMock).toHaveBeenCalledWith(plainText);
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Rendering as Mermaid');
    });
  });

  describe('Edge Cases', () => {
    it('should handle SVG with XML declaration and whitespace', async () => {
      const svgContent = '  \n<?xml version="1.0"?>\n  <svg><rect/></svg>  ';
      
      await handleUpdate(svgContent, 'svg');
      
      // Verify SVG was detected and inserted (contains svg and rect)
      expect(diagramContent.innerHTML).toContain('<svg');
      expect(diagramContent.innerHTML).toContain('rect');
      expect(renderMermaidMock).not.toHaveBeenCalled();
    });

    it('should handle SVG embedded in other content', async () => {
      const svgContent = 'Some text before <svg><rect/></svg> some text after';
      
      await handleUpdate(svgContent, 'svg');
      
      // Should detect SVG via containsSvg check (contains svg and rect)
      expect(diagramContent.innerHTML).toContain('<svg');
      expect(diagramContent.innerHTML).toContain('rect');
      expect(renderMermaidMock).not.toHaveBeenCalled();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Content detection:',
        expect.objectContaining({
          isSvg: true,
          containsSvg: true
        })
      );
    });

    it('should handle PNG format', async () => {
      const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      
      await handleUpdate(pngDataUrl, 'png');
      
      // Verify PNG was inserted as img tag
      expect(diagramContent.innerHTML).toContain('<img');
      expect(diagramContent.innerHTML).toContain(pngDataUrl);
      expect(consoleLogSpy).toHaveBeenCalledWith('[Webview] Displaying as PNG');
    });

    it('should handle very long SVG content', async () => {
      const longSvgContent = '<svg>' + '<rect/>'.repeat(1000) + '</svg>';
      
      await handleUpdate(longSvgContent, 'svg');
      
      // Verify logging includes truncated preview
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webview] Received update:',
        expect.objectContaining({
          contentLength: longSvgContent.length,
          contentPreview: longSvgContent.substring(0, 100)
        })
      );
      
      // Verify SVG was inserted (contains svg and rect)
      expect(diagramContent.innerHTML).toContain('<svg');
      expect(diagramContent.innerHTML).toContain('rect');
    });
  });
});
