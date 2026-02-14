# Debug Logging Guide - Diagram Previewer

## Overview
Comprehensive console logging has been added at every decision point in the rendering pipeline. This will help identify exactly where and why Kroki diagrams might not be rendering correctly.

## How to View the Logs

### 1. Extension Host Console (TypeScript/Node.js side)
**Location:** VSCode Developer Tools → Console tab

**To open:**
1. Help → Toggle Developer Tools
2. Go to the Console tab
3. Look for logs prefixed with `[PanelManager]` and `[KrokiRenderer]`

### 2. Webview Console (JavaScript/Browser side)
**Location:** Webview Inspector → Console tab

**To open:**
1. Right-click in the diagram preview panel
2. Select "Inspect" or "Inspect Element"
3. Go to the Console tab
4. Look for logs prefixed with `[Webview]`

## Complete Log Flow

When you open a `.dsl` file, you should see this sequence:

### Step 1: Opening Preview (Extension Host)
```
[PanelManager] ========== OPENING PREVIEW ==========
[PanelManager] File: /path/to/workspace.dsl
[PanelManager] Extension: .dsl
[PanelManager] Creating new panel (or Revealing existing panel)
```

**What to check:**
- ✅ File path is correct
- ✅ Extension is `.dsl`

### Step 2: Getting Renderer (Extension Host)
```
[PanelManager] ========== GETTING RENDERER ==========
[PanelManager] Original extension: .dsl
[PanelManager] Normalized extension: .dsl
[PanelManager] ✅ Found mapping in EXTENSION_MAP: { renderer: 'kroki', diagramType: 'structurizr' }
```

**What to check:**
- ✅ Extension is normalized correctly
- ✅ Mapping shows `renderer: 'kroki'`
- ✅ Diagram type is `'structurizr'` for .dsl files
- ❌ If you see "Extension NOT found", the file extension isn't in EXTENSION_MAP

### Step 3: Creating Renderer (Extension Host)
```
[PanelManager] ========== CREATING RENDERER ==========
[PanelManager] Mapping: { renderer: 'kroki', diagramType: 'structurizr' }
[PanelManager] Renderer type: kroki
[PanelManager] Diagram type: structurizr
[PanelManager] 🌐 Using KROKI renderer
```

**What to check:**
- ✅ Should show "🌐 Using KROKI renderer" for .dsl files
- ❌ If you see "🎨 Using MERMAID renderer", something is wrong with the mapping

### Step 4: Perform Update (Extension Host)
```
[PanelManager] ========== PERFORM UPDATE ==========
[PanelManager] File: /path/to/workspace.dsl
[PanelManager] Extension: .dsl
[PanelManager] ✅ Renderer obtained, starting render
[PanelManager] Calling renderer.render()...
```

### Step 5: Kroki Renderer (Extension Host)
```
[KrokiRenderer] ========== RENDER START ==========
[KrokiRenderer] Cache key: /path/to/workspace.dsl:abc123...
[KrokiRenderer] Content length: 1234
[KrokiRenderer] Cache miss, rendering via API
[KrokiRenderer] Detected diagram type: structurizr
[KrokiRenderer] Content encoded, length: 567
[KrokiRenderer] Calling Kroki API...
[KrokiRenderer] ✅ Received response from Kroki
[KrokiRenderer] Response length: 12345
[KrokiRenderer] Response preview (first 200 chars): <?xml version="1.0" encoding="UTF-8"?><svg...
[KrokiRenderer] Starts with <?xml: true
[KrokiRenderer] Starts with <svg: false
[KrokiRenderer] Contains <svg: true
[KrokiRenderer] Sanitizing SVG...
[KrokiRenderer] Sanitized length: 12345
[KrokiRenderer] ✅ Result cached and returning
```

**What to check:**
- ✅ Diagram type detected correctly
- ✅ API call succeeds
- ✅ Response contains SVG markup
- ✅ Response starts with `<?xml` or `<svg`
- ✅ Response contains `<svg` somewhere
- ❌ If you see an error, check the Kroki API endpoint and network

### Step 6: Sending to Webview (Extension Host)
```
[PanelManager] Render complete. Result type: svg
[PanelManager] ✅ Sending to webview. Type: svg Length: 12345
[PanelManager] ========== SENDING TO WEBVIEW ==========
[PanelManager] Format: svg
[PanelManager] Content length: 12345
[PanelManager] Content preview (first 200 chars): <?xml version="1.0"...
[PanelManager] Starts with <?xml: true
[PanelManager] Starts with <svg: false
[PanelManager] Contains <svg: true
[PanelManager] ✅ Message posted to webview
```

**What to check:**
- ✅ Result type is `svg`
- ✅ Content length is reasonable (not 0)
- ✅ Content preview shows SVG markup
- ✅ At least one of the "Starts with" or "Contains" checks is true

### Step 7: Webview Receives Message (Webview Console)
```
============================================================
[Webview] ========== HANDLE UPDATE ==========
[Webview] Received update at: 2024-01-15T10:30:45.123Z
[Webview] Format parameter: svg
[Webview] Content length: 12345
[Webview] Content type: string
[Webview] Content preview (first 100 chars): <?xml version="1.0" encoding="UTF-8"?><svg...
============================================================
[Webview] Format is SVG, checking content type...
[Webview] Content detection results:
[Webview]   - startsWithSvg: false
[Webview]   - startsWithXml: true
[Webview]   - containsSvg: true
[Webview]   - isSvg (final): true
============================================================
[Webview] 🌐 DECISION: Displaying as SVG (direct DOM insertion)
[Webview] Inserting into diagramContent.innerHTML...
[Webview] ✅ SVG inserted successfully
[Webview] DOM now contains: <?xml version="1.0" encoding="UTF-8"?><svg...
============================================================
[Webview] Update complete
============================================================
```

**What to check:**
- ✅ Format parameter is `svg`
- ✅ Content length matches what was sent
- ✅ Content preview shows SVG markup
- ✅ `isSvg (final)` is `true`
- ✅ Decision is "Displaying as SVG (direct DOM insertion)"
- ✅ SVG inserted successfully
- ❌ If decision is "Rendering as MERMAID", the content detection failed

## Common Issues and What to Look For

### Issue 1: Wrong Renderer Selected
**Symptoms:**
```
[PanelManager] 🎨 Using MERMAID renderer  ← WRONG for .dsl files
```

**Cause:** File extension not mapped correctly in EXTENSION_MAP

**Fix:** Check `src/diagram-previewer/types.ts` and ensure `.dsl` maps to `{ renderer: 'kroki', diagramType: 'structurizr' }`

### Issue 2: Kroki Returns Non-SVG Content
**Symptoms:**
```
[KrokiRenderer] Starts with <?xml: false
[KrokiRenderer] Starts with <svg: false
[KrokiRenderer] Contains <svg: false
```

**Cause:** Kroki API returned an error or non-SVG content

**Fix:** Check the Kroki API response, verify the diagram syntax is correct

### Issue 3: Webview Detects SVG as Mermaid
**Symptoms:**
```
[Webview]   - isSvg (final): false
[Webview] 🎨 DECISION: Rendering as MERMAID  ← WRONG for Kroki SVG
```

**Cause:** Content doesn't contain `<svg`, `<?xml`, or starts with `<svg`

**Fix:** This should be impossible with the current fix. If you see this, the content from Kroki is malformed.

### Issue 4: Content Not Reaching Webview
**Symptoms:**
- Extension host logs show message posted
- Webview console shows no logs

**Cause:** Webview not initialized or message not received

**Fix:** 
1. Close and reopen the preview panel
2. Reload the extension window
3. Check for CSP violations in webview console

### Issue 5: SVG Insertion Fails
**Symptoms:**
```
[Webview] ❌ Failed to insert SVG into DOM: ...
```

**Cause:** DOM insertion error (CSP, malformed SVG, etc.)

**Fix:** Check the error message, verify CSP settings, check SVG validity

## Testing Procedure

1. **Rebuild the extension:**
   ```bash
   npm run compile
   ```

2. **Restart the extension:**
   - Press F5 or click "Restart" in debug toolbar
   - Or: Ctrl+Shift+P → "Developer: Reload Window"

3. **Open a .dsl file:**
   - Open `docs/03_architecture/diagrams/src/workspace.dsl`

4. **Open the preview:**
   - Click the preview icon in the editor toolbar

5. **Open both consoles:**
   - Extension host: Help → Toggle Developer Tools → Console
   - Webview: Right-click preview → Inspect → Console

6. **Check the logs:**
   - Follow the log flow above
   - Identify where the issue occurs
   - Compare actual logs with expected logs

## Expected Log Summary for Successful Render

**Extension Host:**
```
✅ Opening preview for .dsl file
✅ Found mapping: kroki + structurizr
✅ Using KROKI renderer
✅ Kroki API returned SVG
✅ Content contains <svg
✅ Sent to webview
```

**Webview:**
```
✅ Received format: svg
✅ Content contains SVG markup
✅ isSvg = true
✅ Decision: Display as SVG
✅ SVG inserted successfully
```

## Next Steps

After reviewing the logs, you'll know exactly:
1. Which renderer was selected (Mermaid vs Kroki)
2. What content was returned from the renderer
3. What format was sent to the webview
4. How the webview interpreted the content
5. What decision was made (Mermaid render vs SVG display)
6. Whether the insertion succeeded

This will pinpoint the exact location of the issue.
