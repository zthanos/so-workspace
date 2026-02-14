/**
 * Core types and interfaces for the Diagram Previewer feature
 */

/**
 * Supported diagram render result types
 */
export type RenderResultType = 'svg' | 'png' | 'error';

/**
 * Theme options for diagram rendering
 */
export type Theme = 'light' | 'dark';

/**
 * Options passed to renderers
 */
export interface RenderOptions {
  /** Theme to use for rendering */
  theme: Theme;
  /** Cache key for this render operation */
  cacheKey: string;
  /** Diagram type for Kroki renderer (e.g., 'plantuml', 'structurizr', 'graphviz') */
  diagramType?: string;
}

/**
 * Result of a diagram rendering operation
 */
export interface RenderResult {
  /** Type of result (svg, png, or error) */
  type: RenderResultType;
  /** Rendered content (SVG/PNG data) or error message */
  content: string;
  /** Error message if type is 'error' */
  error?: string;
}

/**
 * Interface that all diagram renderers must implement
 */
export interface IRenderer {
  /**
   * Render diagram content
   * @param content - Raw diagram source code
   * @param options - Rendering options (theme, cache key)
   * @returns Promise resolving to render result
   */
  render(content: string, options: RenderOptions): Promise<RenderResult>;

  /**
   * Get list of file extensions this renderer supports
   * @returns Array of file extensions (e.g., ['.mmd', '.mermaid'])
   */
  getSupportedExtensions(): string[];

  /**
   * Clean up resources used by this renderer
   */
  dispose(): void;
}

/**
 * Configuration for the Diagram Previewer
 */
export interface DiagramPreviewerConfig {
  // General settings
  /** Automatically open preview when diagram files are opened */
  autoOpenPreview: boolean;
  /** Debounce delay in milliseconds for live updates */
  debounceDelay: number;
  /** Maximum number of cached renders */
  cacheSize: number;

  // Kroki settings
  /** Kroki API endpoint URL */
  krokiEndpoint: string;
  /** Minimum interval between Kroki API calls in milliseconds */
  krokiRateLimit: number;
  /** Optional authentication for Kroki */
  krokiAuth?: {
    type: 'basic' | 'bearer';
    credentials: string;
  };

  // Mermaid settings
  /** Mermaid theme configuration */
  mermaidTheme: {
    light: string;
    dark: string;
  };
}

/**
 * Mapping of file extensions to renderer types
 */
export interface ExtensionMapping {
  renderer: 'mermaid' | 'kroki';
  diagramType?: string;
}

/**
 * Cache entry for rendered diagrams
 */
export interface CacheEntry {
  result: RenderResult;
  timestamp: number;
}

/**
 * File extension to renderer mapping
 * Maps file extensions to their appropriate rendering engine and diagram type
 */
export const EXTENSION_MAP: Record<string, ExtensionMapping> = {
  // Mermaid extensions
  '.mmd': { renderer: 'mermaid' },
  '.mermaid': { renderer: 'mermaid' },
  
  // Kroki-supported DSL extensions
  '.dsl': { renderer: 'kroki', diagramType: 'structurizr' },
  '.puml': { renderer: 'kroki', diagramType: 'plantuml' },
  '.plantuml': { renderer: 'kroki', diagramType: 'plantuml' },
  '.pu': { renderer: 'kroki', diagramType: 'plantuml' },
  '.dot': { renderer: 'kroki', diagramType: 'graphviz' },
  '.gv': { renderer: 'kroki', diagramType: 'graphviz' },
  '.bpmn': { renderer: 'kroki', diagramType: 'bpmn' },
  '.excalidraw': { renderer: 'kroki', diagramType: 'excalidraw' },
  '.vg': { renderer: 'kroki', diagramType: 'vega' },
  '.vl': { renderer: 'kroki', diagramType: 'vegalite' },
  '.wsd': { renderer: 'kroki', diagramType: 'plantuml' },
  '.ditaa': { renderer: 'kroki', diagramType: 'ditaa' },
  '.er': { renderer: 'kroki', diagramType: 'erd' },
  '.nomnoml': { renderer: 'kroki', diagramType: 'nomnoml' },
  '.pikchr': { renderer: 'kroki', diagramType: 'pikchr' },
  '.svgbob': { renderer: 'kroki', diagramType: 'svgbob' },
  '.umlet': { renderer: 'kroki', diagramType: 'umlet' },
  '.vdx': { renderer: 'kroki', diagramType: 'vega' },
  '.wavedrom': { renderer: 'kroki', diagramType: 'wavedrom' },
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: DiagramPreviewerConfig = {
  autoOpenPreview: false,
  debounceDelay: 300,
  cacheSize: 50,
  krokiEndpoint: 'http://localhost:8000', // Changed for local Docker testing
  krokiRateLimit: 500,
  mermaidTheme: {
    light: 'default',
    dark: 'dark',
  },
};
