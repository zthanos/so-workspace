/**
 * SvgSanitizer removes potentially malicious content from SVG strings
 * to prevent XSS attacks and other security vulnerabilities.
 * 
 * Validates: Requirements 9.5
 */
export class SvgSanitizer {
  /**
   * Sanitizes SVG content by removing scripts, event handlers, and external references
   * @param svg The SVG string to sanitize
   * @returns Sanitized SVG string safe for display
   */
  sanitize(svg: string): string {
    if (!svg || typeof svg !== 'string') {
      return '';
    }

    try {
      let sanitized = svg;

      // Remove <script> tags and their content
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      // Remove event handler attributes (on*)
      sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
      sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

      // Remove javascript: protocol in href and xlink:href
      sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
      sanitized = sanitized.replace(/xlink:href\s*=\s*["']javascript:[^"']*["']/gi, 'xlink:href="#"');

      // Remove data: URIs that might contain scripts (keep data:image/)
      sanitized = sanitized.replace(/href\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'href="#"');
      sanitized = sanitized.replace(/xlink:href\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'xlink:href="#"');

      // Remove <foreignObject> tags as they can embed HTML
      sanitized = sanitized.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');

      // Remove any remaining dangerous protocols
      const dangerousProtocols = ['vbscript:', 'file:', 'about:'];
      dangerousProtocols.forEach(protocol => {
        const regex = new RegExp(`(href|xlink:href|src)\\s*=\\s*["']${protocol}[^"']*["']`, 'gi');
        sanitized = sanitized.replace(regex, '$1="#"');
      });

      return sanitized;
    } catch (error) {
      console.error('Error sanitizing SVG:', error);
      // Return original SVG if sanitization fails - better than breaking completely
      return svg;
    }
  }
}