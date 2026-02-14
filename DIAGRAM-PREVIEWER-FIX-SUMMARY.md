# Diagram Previewer File Type Detection Fix

## Problem

The file type detection for determining diagram types (Mermaid vs Kroki) was not working properly. Specifically:

1. **GraphViz vs Mermaid Confusion**: Both diagram types can start with `graph`, causing ambiguous detection
2. **Insufficient Content Detection**: Limited patterns for detecting diagram types from content
3. **Lack of Debugging Information**: No logging to help diagnose detection issues

## Solution

### 1. Improved Content Detection Logic (`panelManager.ts`)

**Fixed the detection order and patterns:**

```typescript
// OLD: Checked 'graph' for both Mermaid and GraphViz (ambiguous)
if (trimmedContent.startsWith('graph')) {
  return { renderer: 'mermaid' }; // or kroki? Ambiguous!
}

// NEW: Precise detection with proper ordering
// 1. Check PlantUML first (most specific with @startuml)
// 2. Check Structurizr (workspace keyword)
// 3. Check GraphViz (digraph or graph with curly braces)
// 4. Check Mermaid (graph with direction keywords: TB, LR, etc.)
```

**Key improvements:**
- PlantUML detection includes `@startsalt`, `@startgantt`
- Structurizr detection for `workspace` keyword
- GraphViz detection requires curly braces: `graph {`
- Mermaid detection uses regex: `/^graph\s+(TB|BT|RL|LR|TD)/`
- Added all Mermaid diagram types: `journey`, `gitGraph`, `mindmap`, `timeline`, `quadrantChart`, C4 diagrams, etc.

### 2. Enhanced Logging

Added comprehensive debug logging throughout the detection process:

```typescript
logger?.debug('Getting renderer for file extension', { 
  originalExtension: fileExtension,
  normalizedExtension 
});

logger?.info('Detected diagram type from content', {
  renderer: detectedMapping.renderer,
  diagramType: detectedMapping.diagramType
});
```

Users can now:
- Open "Diagram Previewer" output channel
- See exactly how file type detection works
- Debug issues with specific files

### 3. Test Coverage

Created comprehensive tests (`panelManager.test.ts`):
- 18 test cases covering all detection scenarios
- Extension mapping validation
- Content-based detection patterns
- Case-insensitive extension handling
- GraphViz vs Mermaid disambiguation

All tests pass ✅

### 4. Documentation

Created `docs/diagram-previewer-file-type-detection.md`:
- Explains all three detection methods
- Lists all supported file extensions
- Provides examples for each diagram type
- Troubleshooting guide
- Best practices

## Files Changed

1. `src/diagram-previewer/panelManager.ts`
   - Improved `detectFromContent()` method
   - Enhanced `getRenderer()` with logging
   - Added logging to `createRenderer()`

2. `src/diagram-previewer/panelManager.test.ts` (NEW)
   - 18 test cases for file type detection
   - Validates EXTENSION_MAP
   - Tests content detection patterns

3. `docs/diagram-previewer-file-type-detection.md` (NEW)
   - User-facing documentation
   - Troubleshooting guide
   - Best practices

4. `DIAGRAM-PREVIEWER-FIX-SUMMARY.md` (NEW)
   - This summary document

## Testing

### Manual Testing Steps

1. **Test Mermaid Detection:**
   ```bash
   # Create test.mmd
   graph TB
     A-->B
   ```
   - Open file
   - Run "Open Diagram Preview"
   - Should use Mermaid renderer

2. **Test PlantUML Detection:**
   ```bash
   # Create test.puml
   @startuml
   A -> B
   @enduml
   ```
   - Open file
   - Run "Open Diagram Preview"
   - Should use Kroki renderer with PlantUML

3. **Test GraphViz Detection:**
   ```bash
   # Create test.dot
   digraph G {
     A -> B
   }
   ```
   - Open file
   - Run "Open Diagram Preview"
   - Should use Kroki renderer with GraphViz

4. **Test Content Detection:**
   ```bash
   # Create test.txt (no recognized extension)
   @startuml
   A -> B
   @enduml
   ```
   - Open file
   - Run "Open Diagram Preview"
   - Should detect PlantUML from content
   - Should use Kroki renderer

5. **Check Logging:**
   - Open "Diagram Previewer" output channel
   - Look for detection messages
   - Verify correct renderer is selected

### Automated Testing

```bash
npm test -- panelManager.test.ts
```

Expected: All 18 tests pass ✅

## Impact

### Before Fix
- ❌ GraphViz files might be detected as Mermaid
- ❌ Limited content detection patterns
- ❌ No debugging information
- ❌ Users confused about why wrong renderer is used

### After Fix
- ✅ Accurate detection for all diagram types
- ✅ Comprehensive content detection
- ✅ Detailed logging for debugging
- ✅ Clear documentation for users
- ✅ Test coverage for reliability

## Next Steps

1. **User Testing**: Have users test with their actual diagram files
2. **Feedback Collection**: Gather feedback on detection accuracy
3. **Pattern Expansion**: Add more content detection patterns if needed
4. **Performance Monitoring**: Ensure detection doesn't slow down preview

## Related Requirements

- Requirement 4: File Type Detection
  - 4.1: Route .mmd to Mermaid ✅
  - 4.2: Route DSL extensions to Kroki ✅
  - 4.3: Detect from content when extension is ambiguous ✅
  - 4.4: Prompt user if detection fails ✅
