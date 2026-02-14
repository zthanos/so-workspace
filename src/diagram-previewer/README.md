# Diagram Previewer

This directory contains the implementation of the Diagram Previewer feature for VSCode.

## Directory Structure

```
diagram-previewer/
├── renderers/          # Rendering engines (Mermaid, Kroki)
├── webview/           # Webview UI components (HTML, CSS, JS)
├── panelManager.ts    # Manages webview panel lifecycle
├── renderCache.ts     # LRU cache for rendered diagrams
├── rateLimiter.ts     # Rate limiting for API calls
├── svgSanitizer.ts    # SVG sanitization for security
└── types.ts           # Shared types and interfaces
```

## Dependencies

- **mermaid**: Client-side rendering of Mermaid diagrams
- **pako**: Zlib compression for Kroki API encoding
- **fast-check**: Property-based testing library
- **vitest**: Test runner for unit and property tests

## Testing

Run tests with:
- `npm run test:vitest` - Run all tests once
- `npm run test:vitest:watch` - Run tests in watch mode
- `npm run test:vitest:ui` - Run tests with UI
- `npm run test:vitest:coverage` - Run tests with coverage report

## Implementation Status

See `.kiro/specs/diagram-previewer/tasks.md` for the current implementation status.
