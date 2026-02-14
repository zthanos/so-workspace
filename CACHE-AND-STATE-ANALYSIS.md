# Cache and State Analysis - Diagram Previewer

## Question: Is there a cache or global var that holds the type of diagram to display?

**Answer: NO - There is no persistent cache of diagram type that could cause incorrect rendering.**

## State Variables Analysis

### 1. Extension Host (TypeScript) - PanelManager

**Instance Variables:**
```typescript
class PanelManager {
  private mermaidRenderer: MermaidRenderer | undefined;
  private krokiRenderer: KrokiRenderer | undefined;
  private cache: RenderCache;
  private currentEditor: vscode.TextEditor | undefined;
}
```

**Behavior:**
- `mermaidRenderer` and `krokiRenderer` are **renderer instances**, not diagram type cache
- They are created once and reused for performance
- The **correct renderer is selected fresh** on each render based on file extension
- `cache` stores **rendered results** (SVG/PNG output), not diagram type

**Key Method:**
```typescript
private async getRenderer(fileExtension: string): Promise<IRenderer | undefined> {
  // ALWAYS looks up extension in EXTENSION_MAP
  const mapping = EXTENSION_MAP[fileExtension.toLowerCase()];
  
  // Returns the appropriate renderer based on mapping
  return this.createRenderer(mapping);
}
```

**Verdict:** ✅ No issue - renderer selection is fresh on every render

### 2. Webview (JavaScript) - main.js

**State Variables:**
```javascript
let currentTheme = 'light';
let currentScale = 1.0;
let currentContent = null;
let currentFormat = null;
```

**Behavior:**
- `currentContent` and `currentFormat` are updated on **every** `handleUpdate()` call
- They are only used for the export feature
- They do NOT affect rendering decisions

**Key Code:**
```javascript
async function handleUpdate(content, format) {
  // These are set fresh on every update
  currentContent = content;
  currentFormat = format;
  
  // Decision is made based on the NEW format parameter
  if (format === 'svg') {
    // Check content to determine if SVG or Mermaid
  }
}
```

**Verdict:** ✅ No issue - state is refreshed on every update

### 3. Webview Context Persistence

**Configuration:**
```typescript
retainContextWhenHidden: true
```

**What this means:**
- When the webview panel is hidden (not closed), the JavaScript context is preserved
- Variables like `currentContent`, `currentFormat`, `currentScale` retain their values
- The Mermaid library remains initialized

**Impact on rendering:**
- ❌ **NOT an issue** - `handleUpdate()` is called with fresh data every time
- The preserved state doesn't interfere with new rendering decisions
- Each update overwrites the previous state

**Verdict:** ✅ No issue - context persistence is for performance, not affecting logic

### 4. Render Cache (RenderCache)

**Purpose:**
```typescript
class RenderCache {
  private cache: Map<string, CacheEntry>;
  
  get(key: string): RenderResult | undefined
  set(key: string, result: RenderResult): void
}
```

**What it caches:**
- **Rendered output** (SVG/PNG content)
- **NOT** diagram type or renderer selection

**Cache Key:**
```typescript
// Generated from file path + content hash
const cacheKey = RenderCache.generateKey(fileName, content);
```

**Behavior:**
- If content changes, cache key changes → cache miss → fresh render
- If file extension changes, different renderer is selected → fresh render
- Cache only stores the **final output**, not the rendering decision

**Verdict:** ✅ No issue - cache doesn't affect renderer selection

## The Rendering Decision Flow (No Caching)

```
User opens file.dsl
    ↓
panelManager.performUpdate(editor)
    ↓
fileExtension = path.extname(editor.document.fileName)  // '.dsl'
    ↓
renderer = await this.getRenderer(fileExtension)
    ↓
mapping = EXTENSION_MAP['.dsl']  // FRESH LOOKUP EVERY TIME
    ↓
mapping = { renderer: 'kroki', diagramType: 'structurizr' }
    ↓
renderer = this.createRenderer(mapping)  // Returns KrokiRenderer
    ↓
result = await renderer.render(content, options)
    ↓
result = { type: 'svg', content: '<?xml...><svg>...</svg>' }
    ↓
this.showDiagram(result.content, result.type)
    ↓
webview.postMessage({ type: 'update', content: svgContent, format: 'svg' })
    ↓
webview.handleUpdate(content, 'svg')
    ↓
isSvg = content.includes('<svg')  // FRESH CHECK EVERY TIME
    ↓
Display as SVG (not Mermaid)
```

## Conclusion

**There is NO cache or global variable that incorrectly holds diagram type.**

Every rendering operation:
1. ✅ Looks up file extension in EXTENSION_MAP (fresh)
2. ✅ Selects appropriate renderer (fresh)
3. ✅ Checks content type in webview (fresh)

## Why the Problem Might Persist

If Kroki diagrams are still not rendering after the fix, the issue is likely:

1. **Build/Deployment Issue:**
   - The compiled code in `dist/` doesn't include the fix
   - Run `npm run compile` to rebuild
   - Restart the extension (F5 or Reload Window)

2. **Webview Not Updated:**
   - The webview HTML/JS files weren't copied to dist
   - Check that `dist/webview-main.js` contains the fix
   - Close all preview panels and reopen

3. **Different Root Cause:**
   - The content detection logic might have a different issue
   - Check the webview console logs to see what's actually happening
   - Verify the content being received actually contains `<svg`

4. **CSP (Content Security Policy) Issue:**
   - The webview CSP might be blocking SVG insertion
   - Check browser console for CSP violations

## Debugging Steps

1. **Verify the fix is in dist:**
   ```bash
   # Check if dist/webview-main.js contains the fix
   grep -n "containsSvg" dist/webview-main.js
   ```

2. **Check webview console:**
   - Right-click preview panel → Inspect
   - Look for: `[Webview] Content detection: { isSvg: ..., startsWithXml: ..., containsSvg: ... }`

3. **Verify renderer selection:**
   - Open Output panel → "Diagram Previewer"
   - Look for: `Getting renderer for file extension: .dsl`
   - Should show: `Found mapping: { renderer: 'kroki', diagramType: 'structurizr' }`

4. **Check Kroki API response:**
   - Look for: `Received SVG from Kroki: { contentLength: ..., startsWithXml: true }`
   - Verify the content preview shows SVG markup
