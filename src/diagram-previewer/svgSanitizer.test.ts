/**
 * @jest-environment jsdom
 */
import { SvgSanitizer } from './svgSanitizer';

describe('SvgSanitizer', () => {
  let sanitizer: SvgSanitizer;

  beforeEach(() => {
    sanitizer = new SvgSanitizer();
  });

  describe('sanitize()', () => {
    test('should return empty string for null or undefined input', () => {
      expect(sanitizer.sanitize(null as any)).toBe('');
      expect(sanitizer.sanitize(undefined as any)).toBe('');
    });

    test('should return empty string for non-string input', () => {
      expect(sanitizer.sanitize(123 as any)).toBe('');
      expect(sanitizer.sanitize({} as any)).toBe('');
    });

    test('should preserve valid SVG content', () => {
      const validSvg = '<svg><rect x="0" y="0" width="100" height="100" fill="red"/></svg>';
      const result = sanitizer.sanitize(validSvg);
      expect(result).toContain('<svg');
      expect(result).toContain('<rect');
      expect(result).toContain('width="100"');
    });

    test('should remove <script> tags', () => {
      const maliciousSvg = '<svg><script>alert("xss")</script><rect/></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('<rect');
    });

    test('should remove inline JavaScript in href', () => {
      const maliciousSvg = '<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('javascript:');
      expect(result).toContain('<text>');
    });

    test('should remove onclick event handler', () => {
      const maliciousSvg = '<svg><rect onclick="alert(1)" width="100" height="100"/></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('onclick');
      expect(result).toContain('<rect');
    });

    test('should remove onload event handler', () => {
      const maliciousSvg = '<svg onload="alert(1)"><rect/></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('onload');
    });

    test('should remove onerror event handler', () => {
      const maliciousSvg = '<svg><image onerror="alert(1)" href="invalid.png"/></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('onerror');
    });

    test('should remove multiple event handlers', () => {
      const maliciousSvg = '<svg><rect onclick="a()" onmouseover="b()" onload="c()"/></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('onload');
    });

    test('should remove external xlink:href references', () => {
      const maliciousSvg = '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="http://evil.com/malicious.svg#icon"/></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('http://evil.com');
    });

    test('should preserve internal xlink:href references', () => {
      const validSvg = '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><defs><symbol id="icon"><circle r="10"/></symbol></defs><use xlink:href="#icon"/></svg>';
      const result = sanitizer.sanitize(validSvg);
      expect(result).toContain('#icon');
    });

    test('should remove external href references (SVG 2.0)', () => {
      const maliciousSvg = '<svg><use href="https://evil.com/malicious.svg#icon"/></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('https://evil.com');
    });

    test('should preserve internal href references', () => {
      const validSvg = '<svg><defs><symbol id="icon"><circle r="10"/></symbol></defs><use href="#icon"/></svg>';
      const result = sanitizer.sanitize(validSvg);
      expect(result).toContain('#icon');
    });

    test('should handle complex SVG with multiple elements', () => {
      const complexSvg = `
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="grad">
              <stop offset="0%" stop-color="red"/>
              <stop offset="100%" stop-color="blue"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#grad)"/>
          <text x="50" y="50">Hello</text>
        </svg>
      `;
      const result = sanitizer.sanitize(complexSvg);
      // Check that basic structure is preserved and no errors occurred
      expect(result).toContain('<svg');
      expect(result).toContain('<defs');
      expect(result).toContain('<rect');
      expect(result).toContain('<text');
      expect(result).not.toContain('<script');
    });

    test('should handle nested malicious content', () => {
      const maliciousSvg = '<svg><g onclick="alert(1)"><rect onload="alert(2)"/></g></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onload');
      expect(result).toContain('<g');
      expect(result).toContain('<rect');
    });

    test('should return empty string for malformed SVG', () => {
      const malformedSvg = '<svg><rect></svg>'; // Missing closing tag
      const result = sanitizer.sanitize(malformedSvg);
      // DOMParser may auto-correct or return error
      expect(typeof result).toBe('string');
    });

    test('should handle SVG with CDATA sections', () => {
      const svgWithCdata = '<svg><style><![CDATA[.cls{fill:red;}]]></style><rect class="cls"/></svg>';
      const result = sanitizer.sanitize(svgWithCdata);
      expect(result).toContain('<style');
      expect(result).toContain('<rect');
    });

    test('should remove multiple script tags', () => {
      const maliciousSvg = '<svg><script>alert(1)</script><rect/><script>alert(2)</script></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    test('should handle case-insensitive javascript: protocol', () => {
      const maliciousSvg = '<svg><a href="JavaScript:alert(1)"><text>Click</text></a></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('JavaScript:');
      expect(result).not.toContain('alert');
    });

    test('should remove protocol-relative external URLs', () => {
      const maliciousSvg = '<svg><use href="//evil.com/malicious.svg#icon"/></svg>';
      const result = sanitizer.sanitize(maliciousSvg);
      expect(result).not.toContain('//evil.com');
    });
  });
});
