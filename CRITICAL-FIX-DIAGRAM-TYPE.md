# Critical Fix: Diagram Type Not Passed to Renderer

## Problem Identified

The root cause of the blank preview panel was that the `diagramType` was never passed to the KrokiRenderer, even though it was correctly detected from the file extension.

### The Flow

1. User opens a `.dsl` file
2. `performUpdate()` calls `getRenderer('.dsl')`
3. `getRenderer()` finds mapping: `{ renderer: 'kroki', diagramType: 'structurizr' }`
4. `createRenderer()` creates a KrokiRenderer instance
5. **BUG**: `renderer.render(content, { theme, cacheKey })` is called WITHOUT the `diagramType`
6. KrokiRenderer tries to detect diagram type from cache key (file path)
7. Detection works in some cases but fails in others
8. Without diagram type, Kroki API call fails or returns error

## The Fix

### 1. Added `diagramType` to `RenderOptions` (types.ts)

```typescript
export interface RenderOptions {
  theme: Theme;
  cacheKey: string;
  diagramType?: string;  // ← Added this
}
```

### 2. Modified `getRenderer()` to return both renderer and mapping (panelManager.ts)

Changed return type from:
```typescript
Promise<IRenderer | undefined>
```

To:
```typescript
Promise<{ renderer: IRenderer; mapping: ExtensionMapping } | undefined>
```

This allows `performUpdate()` to access the `diagramType` from the mapping.

### 3. Updated `performUpdate()` to pass `diagramType` (panelManager.ts)

```typescript
// Before:
const renderer = await this.getRenderer(fileExtension);
const result = await renderer.render(content, { theme, cacheKey });

// After:
const result = await this.getRenderer(fileExtension);
const { renderer, mapping } = result;
const renderResult = await renderer.render(content, { 
  theme, 
  cacheKey,
  diagramType: mapping.diagramType  // ← Pass diagram type!
});
```

### 4. Updated `KrokiRenderer.render()` to use `diagramType` from options (krokiRenderer.ts)

```typescript
// Before:
const diagramType = this.detectDiagramTypeFromCacheKey(options.cacheKey);

// After:
let diagramType = options.diagramType;  // Use from options first
if (!diagramType) {
  // Fallback to detection for backward compatibility
  diagramType = this.detectDiagramTypeFromCacheKey(options.cacheKey);
}
```

## Impact

This fix ensures that:
- The diagram type is explicitly passed through the rendering pipeline
- No reliance on fragile file path parsing
- Clear, traceable flow of diagram type information
- Backward compatibility maintained with fallback detection

## Testing

All tests pass:
- Vitest: 42 tests passed
- TypeScript compilation: No errors
- No breaking changes to existing functionality

## Next Steps

1. Rebuild extension: `npm run compile` ✅
2. Reload extension in VSCode (F5 or "Developer: Reload Window")
3. Open a `.dsl` file
4. Check console logs for: `[PanelManager] Calling renderer.render() with diagramType: structurizr`
5. Verify diagram renders correctly

The fix is complete and ready for testing!
