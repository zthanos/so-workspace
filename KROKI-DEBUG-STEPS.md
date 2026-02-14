# Kroki Rendering Debug Steps

## Issue
PUML and DSL files don't render anything in the preview panel.

## Verified Working
✅ Kroki API is accessible and returns valid SVG
✅ File type detection logic is correct
✅ Webview HTML has proper DOCTYPE
✅ Extension compiles without errors

## Debug Steps

### 1. Check Output Channel
1. Open VSCode
2. View → Output
3. Select "Diagram Previewer" from dropdown
4. Open a `.puml` file
5. Run "Open Diagram Preview" command
6. Look for messages like:
   - "Rendering diagram"
   - "Diagram rendered successfully"
   - "Sending diagram to webview"
   - Any error messages

### 2. Check Webview Developer Tools
1. Open a `.puml` file
2. Run "Open Diagram Preview" command
3. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
4. Type "Developer: Open Webview Developer Tools"
5. Select it
6. Check Console tab for:
   - `[Webview] Received update:` messages
   - Any error messages (red text)
   - Network tab for failed requests

### 3. Check for Errors
Look for these specific errors:
- **Network errors**: "Unable to reach Kroki API"
- **Encoding errors**: "Unable to detect diagram type"
- **Rendering errors**: Check if error container is visible in webview

### 4. Test with Simple Diagram
Create a file `test-simple.puml`:
```
@startuml
A -> B
@enduml
```

Try to preview this simple diagram.

### 5. Check Configuration
1. Open VSCode settings
2. Search for "diagramPreviewer"
3. Verify:
   - `diagramPreviewer.krokiEndpoint`: Should be "https://kroki.io"
   - `diagramPreviewer.krokiRateLimit`: Should be 500

## Possible Issues

### Issue 1: Webview Not Receiving Messages
**Symptom**: No console logs in webview developer tools
**Cause**: Panel not created or messages not being sent
**Fix**: Check if `this.panel` is defined in panelManager

### Issue 2: Kroki API Blocked
**Symptom**: Network error in output channel
**Cause**: Firewall, proxy, or network issue
**Fix**: Check network connectivity, try different endpoint

### Issue 3: SVG Not Displaying
**Symptom**: Console shows "Received update" but nothing visible
**Cause**: SVG content issue or CSS hiding content
**Fix**: Check if `#diagram-content` has content in Elements tab

### Issue 4: Error Being Shown
**Symptom**: Error message visible in preview
**Cause**: Rendering failed
**Fix**: Read error message for specific issue

## Next Steps

Based on what you see in the output channel and console:

1. **If you see "Rendering diagram" but no "Diagram rendered successfully"**:
   - The Kroki renderer is failing
   - Check for error messages
   - Verify internet connection

2. **If you see "Diagram rendered successfully" but nothing displays**:
   - The webview is not receiving or displaying the content
   - Check webview console for errors
   - Verify SVG content in Elements tab

3. **If you see no messages at all**:
   - The command might not be triggering
   - Check if file extension is recognized
   - Verify command is registered

## Quick Fix to Try

If nothing works, try this minimal test:

1. Open `src/diagram-previewer/panelManager.ts`
2. Find the `showDiagram` method
3. Add this at the start:
```typescript
console.log('SHOW DIAGRAM CALLED:', { type, contentLength: content.length });
vscode.window.showInformationMessage(`Showing ${type} diagram (${content.length} bytes)`);
```

This will show a popup when trying to display a diagram, confirming the method is being called.
