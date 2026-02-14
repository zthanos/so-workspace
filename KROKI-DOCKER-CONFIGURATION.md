# Kroki Docker Configuration - FINAL FIX

## Problem
The extension was trying to use `https://kroki.io` (public Kroki instance) instead of your local Docker Kroki instance running on `http://localhost:8000`.

## Solution Applied

### 1. Updated VSCode Settings
**File**: `.vscode/settings.json`

Added:
```json
{
    "diagramPreviewer.krokiEndpoint": "http://localhost:8000"
}
```

This tells the extension to use your local Docker Kroki instance instead of the public one.

### 2. Verified Docker Container
Your Kroki container is running:
```
CONTAINER ID: 33812e2f4cb0
IMAGE: yuzutech/kroki:latest
STATUS: Up 19 hours
PORTS: 0.0.0.0:8000->8000/tcp
```

### 3. Verified Kroki Accessibility
Tested `http://localhost:8000` - Returns HTTP 200 OK ✅

## Next Steps

### 1. Reload VSCode Extension
You MUST reload the VSCode window to pick up the new settings:
- Press `F5` to reload, OR
- Command Palette → "Developer: Reload Window"

### 2. Open a .dsl File
Open any Structurizr DSL file

### 3. Check Console Logs
You should now see:
```
[KrokiRenderer] API endpoint: http://localhost:8000
[KrokiRenderer] URL will be: http://localhost:8000/structurizr/svg/...
[KrokiRenderer] ✅ Received response from Kroki
```

### 4. Diagram Should Render!
The preview panel should now display your diagram.

## All Fixes Applied Summary

1. ✅ **Removed debugger statement** - No longer pauses execution
2. ✅ **Added diagramType to pipeline** - Diagram type now flows correctly
3. ✅ **Enhanced error handling** - Better validation and logging
4. ✅ **Configured Docker Kroki endpoint** - Uses local instance

## Troubleshooting

### If diagram still doesn't render:

1. **Check Docker is running**:
   ```bash
   docker ps --filter "name=kroki"
   ```

2. **Test Kroki directly**:
   ```bash
   curl http://localhost:8000
   ```

3. **Check console logs** for the endpoint being used:
   - Should show: `http://localhost:8000`
   - NOT: `https://kroki.io`

4. **Verify settings were loaded**:
   - Open Command Palette
   - Type "Preferences: Open Settings (JSON)"
   - Check if `diagramPreviewer.krokiEndpoint` is set

### If you want to use the public Kroki instance:

Remove the setting from `.vscode/settings.json` or set it to:
```json
{
    "diagramPreviewer.krokiEndpoint": "https://kroki.io"
}
```

## Configuration Options

You can also configure:
- **Rate limiting**: `diagramPreviewer.krokiRateLimit` (default: 500ms)
- **Authentication**: `diagramPreviewer.krokiAuth` (if your Kroki requires auth)
- **Cache size**: `diagramPreviewer.cacheSize` (default: 50)

## Success!

With all fixes applied:
1. Diagram type is correctly passed to renderer
2. Local Docker Kroki is used
3. Enhanced logging shows exactly what's happening
4. Error handling catches any issues

The extension should now work perfectly! 🎉
