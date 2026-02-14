# Console Output Test

## Where to Look for Logs

There are 3 different places logs can appear:

### 1. Developer Tools Console (Extension Host)
- **How to open:** Help → Toggle Developer Tools → Console tab
- **What appears here:** `console.log()`, `console.error()`, JavaScript errors
- **Expected logs:** `[PanelManager]`, `[KrokiRenderer]` with `console.log()`

### 2. Output Panel
- **How to open:** View → Output (Ctrl+Shift+U)
- **Select:** "Diagram Previewer" from dropdown
- **What appears here:** `logger.info()`, `logger.debug()`, `logger.error()`
- **Expected logs:** Logger output with timestamps

### 3. Debug Console
- **How to open:** View → Debug Console
- **What appears here:** Debug output when running in debug mode
- **Expected logs:** Various debug information

### 4. Webview Console (Separate from Extension Host)
- **How to open:** Right-click in the diagram preview panel → Inspect → Console tab
- **What appears here:** Webview JavaScript `console.log()`
- **Expected logs:** `[Webview]` logs

## Your Current Logs

You said you see:
```
[Extension Host] [PanelManager] ✅ Found mapping in EXTENSION_MAP: {renderer: 'kroki', diagramType: 'structurizr'}
[Extension Host] [PanelManager] Mapping: {renderer: 'kroki', diagramType: 'structurizr'}
[Extension Host] [PanelManager] Diagram type: structurizr
```

The `[Extension Host]` prefix suggests these are coming from the **Developer Tools Console**.

## Test: Verify Console.log is Working

1. Open **Help → Toggle Developer Tools**
2. Go to **Console** tab
3. Clear the console (trash icon)
4. Open a .dsl file
5. Click the preview icon
6. Look for logs starting with `[PanelManager]`

You should see MANY more logs than just those 3 lines, including:
- `[PanelManager] ========== OPENING PREVIEW ==========`
- `[PanelManager] ========== PERFORM UPDATE ==========`
- `[PanelManager] Calling renderer.render()...`
- `[KrokiRenderer] ========== RENDER START ==========`

## If You Only See 3 Lines

This means one of these is happening:

### Possibility 1: Logs are Filtered
- Check if there's a filter applied in the console
- Look for a filter input box at the top of the console
- Make sure it's empty or set to show all logs

### Possibility 2: Code is Throwing an Exception
- Look for red error messages in the console
- Check if there's a stack trace
- The exception might be happening silently

### Possibility 3: Async Flow is Breaking
- The code might be waiting for something that never completes
- Check if there's a loading indicator stuck on the preview panel

### Possibility 4: Wrong Console
- Make sure you're looking at the **Extension Host** console (Developer Tools)
- NOT the Webview console (right-click preview → Inspect)
- NOT the Output panel
- NOT the Debug console

## Next Step

Please do this:
1. Open **Help → Toggle Developer Tools**
2. Click **Console** tab
3. Clear the console
4. Type this in the console and press Enter:
   ```javascript
   console.log('TEST FROM CONSOLE')
   ```
5. You should see "TEST FROM CONSOLE" appear
6. Now open a .dsl file and click preview
7. Take a screenshot of ALL the logs that appear
8. Share what you see

This will help us understand where the logs are going and why you're only seeing 3 lines.
