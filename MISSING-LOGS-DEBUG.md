# Missing Logs Debug Guide

## Current Situation

You're only seeing these logs:
```
[PanelManager] ✅ Found mapping in EXTENSION_MAP: {renderer: 'kroki', diagramType: 'structurizr'}
[PanelManager] Mapping: {renderer: 'kroki', diagramType: 'structurizr'}
[PanelManager] Diagram type: structurizr
```

But you're NOT seeing:
- `[PanelManager] ========== PERFORM UPDATE ==========`
- `[PanelManager] Calling renderer.render()...`
- `[KrokiRenderer] ========== RENDER START ==========`
- Any webview logs

## What This Means

The code is stopping inside `createRenderer()` after logging the diagram type. This suggests one of these issues:

### Issue 1: `performUpdate()` is Never Called
The async flow from `openPreview()` → `updatePreview()` → `scheduleUpdate()` → `performUpdate()` might be breaking.

### Issue 2: Exception in `createRenderer()`
An exception might be thrown after the logs but before returning the renderer.

### Issue 3: The Extension Isn't Reloaded
The old compiled code is still running.

## Debugging Steps

### Step 1: Verify Extension is Reloaded
1. After running `npm run compile`, you MUST reload the extension
2. Press **F5** or click **Restart** in the debug toolbar
3. Or: **Ctrl+Shift+P** → "Developer: Reload Window"

### Step 2: Check for Errors in Console
1. Open Developer Tools: **Help → Toggle Developer Tools**
2. Go to **Console** tab
3. Look for any red error messages
4. Check if there are any uncaught exceptions

### Step 3: Add a Breakpoint
1. Open `src/diagram-previewer/panelManager.ts`
2. Find the `performUpdate` method (around line 450)
3. Click in the gutter to add a breakpoint at the first line
4. Open a .dsl file and trigger the preview
5. See if the breakpoint is hit

### Step 4: Check the Call Stack
If you see the logs but nothing happens:
1. The logs from `createRenderer` are being called from `getRenderer`
2. `getRenderer` is called from `performUpdate`
3. But you're not seeing `performUpdate` logs

This means either:
- `performUpdate` logs aren't in the compiled code
- `performUpdate` is throwing an exception before the logs

### Step 5: Force a Clean Rebuild
```bash
# Delete dist folder
rm -rf dist

# Rebuild
npm run compile

# Restart extension
```

### Step 6: Check if Logs Are in Compiled Code
```bash
# Search for the log in compiled code
grep -n "PERFORM UPDATE" dist/extension.js
```

If this returns nothing, the logs aren't being compiled.

### Step 7: Simplify the Test
Create a minimal test:
1. Add this at the very start of `performUpdate`:
   ```typescript
   console.log('PERFORMUPDATE CALLED!!!');
   throw new Error('TESTING - STOP HERE');
   ```
2. Compile and reload
3. Open preview
4. You should see the log and an error

If you DON'T see this log, then `performUpdate` isn't being called at all.

## Most Likely Cause

Based on the logs stopping at `createRenderer`, the most likely issue is:

**The extension wasn't properly reloaded after compilation.**

### Solution:
1. Close ALL diagram preview panels
2. Run `npm run compile`
3. Press **F5** or **Ctrl+Shift+P** → "Developer: Reload Window"
4. Open a .dsl file
5. Click the preview icon
6. Check BOTH consoles:
   - Extension Host (Help → Toggle Developer Tools)
   - Webview (Right-click preview → Inspect)

## Expected Full Log Sequence

After reload, you should see:

**Extension Host Console:**
```
[PanelManager] ========== OPENING PREVIEW ==========
[PanelManager] File: /path/to/file.dsl
[PanelManager] Extension: .dsl
[PanelManager] Creating new panel
[PanelManager] ========== PERFORM UPDATE ==========
[PanelManager] File: /path/to/file.dsl
[PanelManager] Extension: .dsl
[PanelManager] ========== GETTING RENDERER ==========
[PanelManager] Original extension: .dsl
[PanelManager] Normalized extension: .dsl
[PanelManager] ✅ Found mapping in EXTENSION_MAP: {renderer: 'kroki', diagramType: 'structurizr'}
[PanelManager] About to call createRenderer...
[PanelManager] ========== CREATING RENDERER ==========
[PanelManager] Mapping: {renderer: 'kroki', diagramType: 'structurizr'}
[PanelManager] Renderer type: kroki
[PanelManager] Diagram type: structurizr
[PanelManager] 🌐 Using KROKI renderer
[PanelManager] Creating new Kroki renderer instance...
[PanelManager] Kroki renderer instance created
[PanelManager] Returning Kroki renderer instance
[PanelManager] ✅ createRenderer returned successfully
[PanelManager] ✅ Renderer obtained, starting render
[PanelManager] Calling renderer.render()...
[KrokiRenderer] ========== RENDER START ==========
[KrokiRenderer] Cache key: ...
[KrokiRenderer] Content length: ...
... (more logs)
```

If you're only seeing the first 3 lines from `createRenderer`, the code is definitely not progressing.

## Quick Test

Add this to the TOP of `openPreview` method:
```typescript
console.log('='.repeat(80));
console.log('OPENPREVIEW CALLED - TIMESTAMP:', Date.now());
console.log('='.repeat(80));
```

If you don't see this, the preview isn't being triggered at all.

## Next Steps

1. **Reload the extension** (most important!)
2. Check for the full log sequence
3. If still missing logs, add the simple test from Step 7
4. Report back which logs you see
