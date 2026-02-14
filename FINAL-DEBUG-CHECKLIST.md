# Final Debug Checklist - Kroki Rendering Fix

## Changes Applied

### 1. ✅ Removed debugger statement
- **File**: `src/diagram-previewer/panelManager.ts`
- **Issue**: `debugger` statement in `createRenderer()` could pause execution
- **Fix**: Removed the debugger line

### 2. ✅ Added diagramType to render pipeline
- **Files**: `types.ts`, `panelManager.ts`, `krokiRenderer.ts`
- **Issue**: Diagram type was detected but never passed to renderer
- **Fix**: 
  - Added `diagramType?: string` to `RenderOptions`
  - Modified `getRenderer()` to return `{ renderer, mapping }`
  - Pass `diagramType: mapping.diagramType` to `render()` call

### 3. ✅ Enhanced error handling in KrokiRenderer
- **File**: `src/diagram-previewer/renderers/krokiRenderer.ts`
- **Added**:
  - Validation of `cache` and `apiEndpoint` before use
  - Try-catch around cache operations
  - More detailed error logging with stack traces
  - URL preview before API call

## What to Check When Testing

### Step 1: Rebuild and Reload
```bash
npm run compile
```
Then reload VSCode extension (F5 or "Developer: Reload Window")

### Step 2: Open a .dsl file
Open any Structurizr DSL file in the workspace

### Step 3: Check Console Logs
Look for this sequence in the Extension Host console:

```
[PanelManager] ========== PERFORM UPDATE ==========
[PanelManager] File: <your-file>.dsl
[PanelManager] Extension: .dsl

[PanelManager] ========== GETTING RENDERER ==========
[PanelManager] ✅ Found mapping in EXTENSION_MAP: {renderer: 'kroki', diagramType: 'structurizr'}

[PanelManager] ========== CREATING RENDERER ==========
[PanelManager] 🌐 Using KROKI renderer
[PanelManager] Diagram type: structurizr

[PanelManager] Calling renderer.render() with diagramType: structurizr

[KrokiRenderer] ========== RENDER START ==========
[KrokiRenderer] Diagram type from options: structurizr
[KrokiRenderer] API endpoint: https://kroki.io
[KrokiRenderer] Using diagram type: structurizr
[KrokiRenderer] Encoding content...
[KrokiRenderer] Content encoded, length: <number>
[KrokiRenderer] Calling Kroki API...
[KrokiRenderer] URL will be: https://kroki.io/structurizr/svg/...
[KrokiRenderer] ✅ Received response from Kroki
[KrokiRenderer] Response length: <number>
[KrokiRenderer] Starts with <?xml: true/false
[KrokiRenderer] Starts with <svg: true/false
[KrokiRenderer] Contains <svg: true

[PanelManager] ✅ Sending to webview. Type: svg Length: <number>
```

### Step 4: Check for Errors

#### If you see "cache is undefined":
- The KrokiRenderer wasn't initialized properly
- Check `createRenderer()` logs

#### If you see "apiEndpoint is undefined":
- Config not loaded properly
- Check `readConfig()` in config.ts

#### If you see "Unable to detect diagram type":
- The diagramType is still not being passed
- Check the `performUpdate()` logs for "with diagramType:"

#### If you see HTTP errors:
- Network issue or Kroki API problem
- Check the URL being called
- Try the URL manually in a browser

### Step 5: Webview Inspection
If the diagram still doesn't appear:
1. Try to open Webview Developer Tools:
   - Right-click on preview panel → "Inspect Element"
   - Or Command Palette → "Developer: Open Webview Developer Tools"
2. Check for JavaScript errors in webview console
3. Look for the `[Webview] ========== HANDLE UPDATE ==========` log

## Common Issues and Solutions

### Issue: Blank preview panel
**Possible causes**:
1. Webview not receiving message → Check `showDiagram()` logs
2. SVG content empty → Check Kroki API response
3. Webview JavaScript error → Inspect webview console
4. CSP blocking content → Check browser console for CSP errors

### Issue: "Unable to detect diagram type"
**Solution**: The diagramType fix should resolve this. If still happening:
- Verify `options.diagramType` is set in render call
- Check `performUpdate()` logs for "with diagramType:"

### Issue: Kroki API errors
**Possible causes**:
1. Network connectivity
2. Invalid diagram syntax
3. Kroki service down
4. Wrong diagram type for content

**Debug**:
- Copy the URL from logs and test in browser
- Check if content is valid for the diagram type
- Try a simple diagram first

## Test with Simple Diagram

Create a test file `test.dsl`:
```
workspace {
    model {
        user = person "User"
        system = softwareSystem "System"
        user -> system "Uses"
    }
    views {
        systemContext system {
            include *
            autoLayout
        }
    }
}
```

This should render successfully if everything is working.

## Next Steps if Still Not Working

1. **Share the complete console log** from opening the file
2. **Check if Kroki API is accessible**: Visit https://kroki.io in browser
3. **Try a different diagram type**: Test with a `.puml` file
4. **Check VSCode version**: Ensure you're on a recent version
5. **Check for extension conflicts**: Disable other diagram extensions

## Success Indicators

✅ Console shows "Diagram type from options: structurizr"  
✅ Console shows "Calling Kroki API..."  
✅ Console shows "✅ Received response from Kroki"  
✅ Console shows "✅ Sending to webview"  
✅ Preview panel shows the rendered diagram  

If all these appear, the fix is working!
