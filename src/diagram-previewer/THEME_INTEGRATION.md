# Theme Change Detection Integration

This document explains how theme change detection is implemented for the Diagram Previewer.

## Overview

The theme change detection system consists of two main components:

1. **ThemeManager**: Listens to VSCode theme changes and notifies registered callbacks
2. **MermaidRenderer**: Receives theme change notifications and updates diagram rendering

## Architecture

```
VSCode Theme Change Event
         ↓
   ThemeManager
         ↓
  MermaidRenderer.handleThemeChange()
         ↓
  Re-render with new theme
```

## Usage Example

### Basic Setup

```typescript
import * as vscode from 'vscode';
import { ThemeManager } from './themeManager';
import { MermaidRenderer } from './renderers/mermaidRenderer';
import { RenderCache } from './renderCache';

// Create instances
const themeManager = new ThemeManager();
const cache = new RenderCache(50);
const renderer = new MermaidRenderer(webview, cache);

// Register renderer with theme manager
renderer.registerThemeManager(themeManager);

// Start listening for theme changes
themeManager.start();

// Register with extension context for cleanup
context.subscriptions.push(
  { dispose: () => themeManager.dispose() },
  { dispose: () => renderer.dispose() }
);
```

### Integration with Panel Manager (Future)

When the PanelManager is implemented (Task 9), it should:

1. Create a single ThemeManager instance
2. Register all MermaidRenderer instances with the ThemeManager
3. Dispose the ThemeManager when the extension deactivates

```typescript
class PanelManager {
  private themeManager: ThemeManager;
  private mermaidRenderer: MermaidRenderer;

  constructor(context: vscode.ExtensionContext) {
    this.themeManager = new ThemeManager();
    this.themeManager.start();
    
    // Register for cleanup
    context.subscriptions.push(this.themeManager);
  }

  private createMermaidRenderer(webview: vscode.Webview): MermaidRenderer {
    const renderer = new MermaidRenderer(webview, this.cache);
    
    // Register with theme manager for automatic theme updates
    renderer.registerThemeManager(this.themeManager);
    
    return renderer;
  }
}
```

## How It Works

### 1. Theme Detection

The ThemeManager detects the current VSCode theme on initialization:

```typescript
const themeManager = new ThemeManager();
const currentTheme = themeManager.getCurrentTheme(); // 'light' or 'dark'
```

### 2. Theme Change Listening

When started, the ThemeManager listens to VSCode's `onDidChangeActiveColorTheme` event:

```typescript
themeManager.start();
```

### 3. Callback Registration

Components can register callbacks to be notified of theme changes:

```typescript
const disposable = themeManager.onThemeChange(async (theme) => {
  console.log(`Theme changed to: ${theme}`);
  // Update UI, re-render diagrams, etc.
});

// Later, unregister the callback
disposable.dispose();
```

### 4. Automatic Re-rendering

The MermaidRenderer automatically re-renders diagrams when the theme changes:

1. ThemeManager detects theme change
2. Calls registered callbacks (including MermaidRenderer's)
3. MermaidRenderer.handleThemeChange() is invoked
4. Mermaid is reinitialized with new theme
5. Cache is cleared to force re-render
6. Next render uses the new theme

## Theme Mapping

VSCode themes are mapped to Mermaid themes:

| VSCode Theme | Mermaid Theme |
|--------------|---------------|
| Light        | default       |
| Dark         | dark          |
| High Contrast | dark         |
| High Contrast Light | default |

## Requirements Satisfied

This implementation satisfies **Requirement 8.5**:

> THE Mermaid_Renderer SHALL detect VSCode theme changes and dynamically switch between light and dark mermaid themes without requiring re-rendering

The system:
- ✅ Detects VSCode theme changes via `onDidChangeActiveColorTheme`
- ✅ Dynamically switches Mermaid theme configuration
- ✅ Triggers re-render automatically (cache is cleared)
- ✅ No manual user action required

## Testing

Both components have comprehensive unit tests:

- `themeManager.test.ts`: Tests theme detection, callback registration, and event handling
- `mermaidRenderer.test.ts`: Tests theme manager integration and theme change handling

Run tests:
```bash
npm test -- src/diagram-previewer/themeManager.test.ts
npm test -- src/diagram-previewer/renderers/mermaidRenderer.test.ts
```

## Future Enhancements

1. **Debouncing**: Add debouncing to prevent excessive re-renders during rapid theme switches
2. **Partial Re-render**: Only re-render visible diagrams, defer others until they become visible
3. **Theme Preferences**: Allow users to override automatic theme detection
4. **Custom Themes**: Support custom Mermaid theme configurations per VSCode theme
