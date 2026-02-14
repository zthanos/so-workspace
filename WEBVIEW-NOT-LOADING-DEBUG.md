# Webview Not Loading - Critical Issue Found

## The Problem

You said: **"I cannot do inspect on preview page"**

This is the ROOT CAUSE! The webview isn't loading properly, which is why:
1. You can't right-click → Inspect
2. The logs stop after `createRenderer`
3. The diagram doesn't display

## Why This Happens

The webview panel is created, but the webview content (HTML/JavaScript) isn't loading. This could be because:
1. The HTML file isn't found
2. The JavaScript file isn't found  
3. There's a Content Security Policy (CSP) error
4. The webview is crashing silently

## New Logs Added

I've added logs to track webview creation:
```
[PanelManager] Creating webview panel...
[PanelManager] Webview panel created
[PanelManager] Setting HTML content...
[PanelManager] HTML content set
[PanelManager] Panel setup complete
```

## Steps to Debug

### Step 1: Rebuild and Reload
```bash
npm run compile
```
Then reload the extension (Ctrl+Shift+P → "Developer: Reload Window")

### Step 2: Check for Webview Creation Logs
1. Open Developer Tools (Help → Toggle Developer Tools)
2. Clear console
3. Open a .dsl file and click preview
4. Look for the new logs above

**If you see all 5 logs**, the webview is being created but the content isn't loading.
**If you don't see them**, there's an error during panel creation.

### Step 3: Check for Errors
In the Developer Tools console, look for:
- Red error messages
- "Failed to load resource"
- "Content Security Policy" errors
- Any exceptions or stack traces

### Step 4: Verify Files Exist
Check that these files exist:
```bash
ls dist/webview-main.js
ls dist/webview-index.html
ls dist/mermaid/mermaid.esm.min.mjs
```

All three should exist. If any are missing, the webview can't load.

### Step 5: Enable Webview Developer Tools

VSCode has a setting to enable webview devtools. Try this:

1. Open Settings (Ctrl+,)
2. Search for "webview"
3. Look for "Webview: Developer Tools"
4. Enable it if it's disabled

OR add this to your settings.json:
```json
{
  "webview.experimental.useExternalEndpoint": false
}
```

### Step 6: Try Opening Webview Devtools via Command

Try running this in the Developer Tools console:
```javascript
// Get all webview panels
vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools')
```

This might open the webview devtools even if right-click doesn't work.

### Step 7: Check Extension Host Logs

Look in the Developer Tools console for any of these errors:
- "Cannot read property 'webview' of undefined"
- "panel is not defined"
- "Failed to create webview"
- Any errors mentioning "webview" or "panel"

## Most Likely Causes

### Cause 1: Webview HTML/JS Files Not Found
**Symptom:** Blank preview panel, can't inspect

**Solution:**
1. Verify files exist in `dist/` folder
2. Check that `esbuild.config.js` is copying files correctly
3. Rebuild: `npm run compile`

### Cause 2: Content Security Policy Blocking Scripts
**Symptom:** Webview loads but scripts don't run

**Solution:** Check the CSP in `webview/index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src {{cspSource}} https://kroki.io https: data:; script-src 'nonce-{{nonce}}'; style-src 'unsafe-inline';">
```

### Cause 3: Mermaid Library Not Found
**Symptom:** Webview loads but crashes when trying to load Mermaid

**Solution:**
1. Check `dist/mermaid/` folder exists
2. Check `mermaid.esm.min.mjs` file exists
3. Rebuild if missing

### Cause 4: Webview Crashing Silently
**Symptom:** Panel appears but is blank, can't inspect

**Solution:** Look for crash logs in:
- Developer Tools console
- VSCode's own logs (Help → Toggle Developer Tools → Console)
- System console (if running VSCode from terminal)

## Quick Test

Add this to the very start of `getWebviewContent` method:
```typescript
private getWebviewContent(webview: vscode.Webview): string {
  console.log('[PanelManager] getWebviewContent called');
  console.log('[PanelManager] Extension path:', this.context.extensionPath);
  console.log('[PanelManager] Webview CSP source:', webview.cspSource);
  
  // ... rest of method
}
```

This will tell us if the HTML generation is even being called.

## Expected Behavior

When working correctly, you should be able to:
1. Open a .dsl file
2. Click the preview icon
3. See a panel open on the right
4. Right-click in the panel
5. See "Inspect" or "Inspect Element" option
6. Click it to open webview devtools

If you can't do step 5, the webview isn't loading at all.

## Next Steps

1. Rebuild: `npm run compile`
2. Reload extension
3. Open preview
4. Check Developer Tools console for the new logs
5. Look for ANY error messages (red text)
6. Report back what you see

The key is finding out WHY the webview isn't loading. Once we know that, we can fix it.
