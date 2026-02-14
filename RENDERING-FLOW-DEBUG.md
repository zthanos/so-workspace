# Diagram Rendering Flow - Complete Trace

## Overview
This document explains the complete flow from opening a diagram file to displaying it in the webview, and how to debug rendering issues.

## The Complete Flow

### 1. File Extension Detection
**Location:** `src/diagram-previewer/panelManager.ts` → `getRenderer()`

```typescript
// When you open a .dsl file:
const fileExtension = '.dsl'
const mapping = EXTENSION_MAP['.dsl']
// Result: { renderer: 'kroki', diagramType: 'structurizr' }
```

**Debug:** Open VSCode Developer Tools (Help → Toggle Developer Tools) and check the Output panel for "Diagram Previewer" logs.

### 2. Renderer Selection
**Location:** `src/diagram-previewer/panelManager.ts` → `createRenderer()`

```typescript
// Creates KrokiRenderer for .dsl files
if (mapping.renderer === 'kroki') {
  return new KrokiRenderer(cache, krokiConfig)
}
```

### 3. Kroki API Call
**Location:** `src/diagram-previewer/renderers/krokiRenderer.ts` → `render()`

```typescript
// Encodes content and calls Kroki API
const url = `https://kroki.io/structurizr/svg/{encoded_content}`
const svgContent = await fetch(url)
// Returns: '<?xml version="1.0"?><svg>...</svg>' or '<svg>...</svg>'

// Returns RenderResult:
return {
  type: 'svg',
  content: svgContent  // The SVG string from Kroki
}
```

**Debug:** Check the console for log:
```
[Diagram Previewer] Received SVG from Kroki: {
  contentLength: 12345,
  startsWithXml: true,
  startsWithSvg: false,
  contentPreview: "<?xml version..."
}
```

### 4. Send to Webview
**Location:** `src/diagram-previewer/panelManager.ts` → `showDiagram()`

```typescript
// Sends message to webview
this.panel.webview.postMessage({
  type: 'update',
  content: svgContent,  // The SVG string
  format: 'svg'         // Always 'svg' for Kroki
})
```

**Debug:** Check the console for log:
```
[Diagram Previewer] Sending diagram to webview: {
  type: "svg",
  contentLength: 12345,
  contentPreview: "<?xml version..."
}
```

### 5. Webview Receives Message
**Location:** `src/diagram-previewer/webview/main.js` → `handleUpdate()`

```javascript
// Receives the message
async function handleUpdate(content, format) {
  // format = 'svg'
  // content = '<?xml version="1.0"?><svg>...</svg>'
  
  console.log('[Webview] Received update:', { 
    format,                              // 'svg'
    contentLength: content?.length,      // 12345
    contentPreview: content?.substring(0, 100)  // '<?xml version...'
  })
  
  if (format === 'svg') {
    const trimmedContent = content.trim()
    
    // Detection logic
    const startsWithSvg = trimmedContent.startsWith('<svg')     // false
    const startsWithXml = trimmedContent.startsWith('<?xml')    // true
    const containsSvg = trimmedContent.includes('<svg')         // true
    const isSvg = startsWithSvg || startsWithXml || containsSvg // true
    
    console.log('[Webview] Content detection:', { 
      isSvg,           // true
      startsWithSvg,   // false
      startsWithXml,   // true
      containsSvg      // true
    })
    
    if (!isSvg) {
      // This path is for raw Mermaid content
      console.log('[Webview] Rendering as Mermaid')
      await renderMermaid(content)
    } else {
      // This path is for Kroki SVG (SHOULD EXECUTE THIS)
      console.log('[Webview] Displaying as SVG')
      diagramContent.innerHTML = content
    }
  }
}
```

**Debug:** Open the webview Developer Tools:
1. Right-click in the diagram preview panel
2. Select "Inspect" or "Inspect Element"
3. Go to Console tab
4. Look for these logs:
   - `[Webview] Received update: { format: 'svg', contentLength: ..., contentPreview: '<?xml...' }`
   - `[Webview] Content detection: { isSvg: true, startsWithXml: true, ... }`
   - `[Webview] Displaying as SVG`

## Decision Tree

```
File opened (.dsl)
    ↓
EXTENSION_MAP lookup → { renderer: 'kroki', diagramType: 'structurizr' }
    ↓
KrokiRenderer.render()
    ↓
Kroki API call → Returns SVG string
    ↓
panelManager.showDiagram(svgContent, 'svg')
    ↓
webview.postMessage({ type: 'update', content: svgContent, format: 'svg' })
    ↓
webview.handleUpdate(content, 'svg')
    ↓
Is format === 'svg'? → YES
    ↓
Trim content and check:
  - startsWithSvg = content.startsWith('<svg')
  - startsWithXml = content.startsWith('<?xml')
  - containsSvg = content.includes('<svg')
  - isSvg = startsWithSvg || startsWithXml || containsSvg
    ↓
Is isSvg === true? 
    ↓
  YES → diagramContent.innerHTML = content (DISPLAY SVG)
    ↓
  NO → renderMermaid(content) (RENDER AS MERMAID)
```

## Common Issues

### Issue 1: Kroki SVG being rendered as Mermaid
**Symptom:** Webview logs show `[Webview] Rendering as Mermaid` for Kroki content

**Cause:** `isSvg` is evaluating to `false`

**Debug:**
1. Check webview console for the detection log
2. Verify all three checks: `startsWithSvg`, `startsWithXml`, `containsSvg`
3. Check if content is being modified before reaching webview

**Fix:** Already implemented in the code - the `containsSvg` fallback should catch this

### Issue 2: Extension not reloaded
**Symptom:** Changes to code don't appear in running extension

**Solution:**
1. Run `npm run compile` to rebuild
2. Press F5 or click "Restart" in the debug toolbar
3. Or: Press Ctrl+Shift+P → "Developer: Reload Window"

### Issue 3: Webview cache
**Symptom:** Old webview code is still running

**Solution:**
1. Close all diagram preview panels
2. Reload the extension window
3. Reopen the diagram file

### Issue 4: Wrong renderer selected
**Symptom:** Mermaid renderer is being used instead of Kroki

**Debug:**
1. Check extension host console for: `[Diagram Previewer] Getting renderer for file extension`
2. Verify the file extension is in EXTENSION_MAP
3. Check if the mapping points to 'kroki'

## Debugging Checklist

When a .dsl file doesn't render:

- [ ] Check extension host console (Output → Diagram Previewer)
  - [ ] "Getting renderer for file extension: .dsl"
  - [ ] "Found mapping: { renderer: 'kroki', diagramType: 'structurizr' }"
  - [ ] "Rendering diagram via Kroki: { diagramType: 'structurizr' }"
  - [ ] "Received SVG from Kroki: { contentLength: ..., startsWithXml: true }"
  - [ ] "Sending diagram to webview: { type: 'svg', contentLength: ... }"

- [ ] Check webview console (Right-click preview → Inspect)
  - [ ] "[Webview] Received update: { format: 'svg', contentLength: ... }"
  - [ ] "[Webview] Content detection: { isSvg: true, ... }"
  - [ ] "[Webview] Displaying as SVG"

- [ ] Check DOM
  - [ ] `#diagram-content` element contains `<svg>` element
  - [ ] No error messages visible

## Testing the Fix

To verify the fix is working:

1. Open a .dsl file (e.g., `docs/03_architecture/diagrams/src/workspace.dsl`)
2. Open diagram preview (click preview icon in editor toolbar)
3. Open webview DevTools (right-click preview → Inspect)
4. Check console logs:
   ```
   [Webview] Received update: { format: "svg", contentLength: 12345, contentPreview: "<?xml..." }
   [Webview] Content detection: { isSvg: true, startsWithXml: true, containsSvg: true }
   [Webview] Displaying as SVG
   ```
5. Verify the diagram displays correctly

## Key Files

- **Extension Host (TypeScript):**
  - `src/diagram-previewer/panelManager.ts` - Orchestrates rendering
  - `src/diagram-previewer/renderers/krokiRenderer.ts` - Calls Kroki API
  - `src/diagram-previewer/types.ts` - EXTENSION_MAP

- **Webview (JavaScript):**
  - `src/diagram-previewer/webview/main.js` - Content detection logic
  - `src/diagram-previewer/webview/index.html` - Webview HTML

- **Build Output:**
  - `dist/extension.js` - Compiled extension code
  - `dist/webview-main.js` - Copied webview JavaScript
  - `dist/webview-index.html` - Copied webview HTML
