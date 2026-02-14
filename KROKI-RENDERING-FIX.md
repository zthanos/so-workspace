# Kroki Rendering Fix - Empty Preview Panel

## Issue
DSL and PUML files were not displaying anything in the preview panel. The panel remained empty even though Mermaid diagrams worked correctly.

## Root Cause
The Kroki renderer was returning the Kroki API URL directly instead of fetching the actual SVG content. The webview was attempting to display this URL as an image, but it wasn't loading properly due to:

1. The URL being treated as content rather than being fetched
2. Potential CSP (Content Security Policy) restrictions
3. The webview expecting actual SVG markup, not a URL

## Solution
Modified `src/diagram-previewer/renderers/krokiRenderer.ts` to:

1. **Fetch the SVG content** from the Kroki API instead of returning the URL
2. **Apply rate limiting** properly using the `throttle()` method with a callback function
3. **Sanitize the SVG** content before returning it
4. **Cache the result** for performance

### Changes Made

#### 1. KrokiRenderer.render() method
**Before:**
```typescript
// Generate Kroki URL (let the browser fetch it directly)
const krokiUrl = `${this.apiEndpoint}/${diagramType}/svg/${encodedContent}`;
const result: RenderResult = {
  type: 'svg',
  content: krokiUrl, // Return URL instead of SVG content
};
```

**After:**
```typescript
// Fetch SVG content from Kroki API with rate limiting
const svgContent = await this.rateLimiter.throttle(async () => {
  return await this.makeRequest(diagramType, encodedContent, 'svg');
});

// Sanitize SVG content
const sanitizedSvg = this.sanitizer.sanitize(svgContent);

const result: RenderResult = {
  type: 'svg',
  content: sanitizedSvg,
};
```

#### 2. Webview JavaScript (main.js)
Removed the URL detection logic since we're now sending actual SVG content:

**Before:**
```javascript
const isUrl = trimmedContent.startsWith('http://') || trimmedContent.startsWith('https://');
if (isUrl) {
  diagramContent.innerHTML = `<img src="${content}" alt="Diagram" />`;
}
```

**After:**
```javascript
// Simply check if it's SVG or raw Mermaid content
const isSvg = trimmedContent.startsWith('<svg') || trimmedContent.startsWith('<?xml');
if (!isSvg) {
  await renderMermaid(content);
} else {
  diagramContent.innerHTML = content;
}
```

#### 3. PanelManager
Removed diagnostic popup message that was added for debugging.

## Testing
After the fix:
1. Rebuild the extension: `npm run compile`
2. Reload the extension in VSCode
3. Open a `.puml` or `.dsl` file
4. Run "Open Diagram Preview" command
5. The diagram should now render correctly

## Benefits
- ✅ Proper SVG content fetching from Kroki API
- ✅ Rate limiting applied correctly
- ✅ SVG sanitization for security
- ✅ Caching for performance
- ✅ Consistent behavior with Mermaid renderer
- ✅ No CSP issues with external URLs

## Related Files
- `src/diagram-previewer/renderers/krokiRenderer.ts` - Main fix
- `src/diagram-previewer/webview/main.js` - Simplified content detection
- `src/diagram-previewer/panelManager.ts` - Removed debug code
