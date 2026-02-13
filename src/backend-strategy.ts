/**
 * Backend Strategy Interfaces and Types
 * 
 * Defines the strategy pattern for diagram rendering backends.
 * Supports multiple rendering backends (Java-based local)
 * for Mermaid, PlantUML, and Structurizr diagrams.
 */

import { DiagramFile } from "./diagram_renderer_v2";

// ============================================================================
// Core Types
// ============================================================================

/**
 * Diagram type enumeration
 * Supports Mermaid, PlantUML, and Structurizr diagram formats
 */
export type DiagramType = "mermaid" | "plantuml" | "structurizr";

/**
 * Render output format
 */
export type RenderFormat = "svg" | "png";

// ============================================================================
// Backend Strategy Interface
// ============================================================================

/**
 * Backend strategy for rendering diagrams
 * Supports multiple diagram types through a unified interface
 */
export interface RenderBackend {
  /** Backend name for logging and error messages */
  readonly name: string;
  
  /** 
   * Check if backend is available and ready to use
   * @returns Backend availability status with supported diagram types
   */
  isAvailable(): Promise<BackendAvailability>;
  
  /** 
   * Render a diagram file to SVG/PNG
   * @param file - Diagram file information
   * @param content - Diagram source content
   * @returns Rendered output with content and format information
   */
  render(file: DiagramFile, content: string): Promise<RenderOutput>;
  
  /** 
   * Cleanup resources (optional)
   * Called when backend is no longer needed
   */
  cleanup?(): Promise<void>;
}

// ============================================================================
// Backend Availability
// ============================================================================

/**
 * Backend availability status
 * Indicates whether a backend is ready to render diagrams
 */
export interface BackendAvailability {
  /** Whether backend is available and ready to use */
  available: boolean;
  
  /** Error message if not available (optional) */
  message?: string;
  
  /** List of diagram types supported by this backend */
  supportedTypes: DiagramType[];
}

// ============================================================================
// Render Output
// ============================================================================

/**
 * Render output from backend
 * Contains the rendered diagram content and format information
 */
export interface RenderOutput {
  /** Rendered content (SVG as string or PNG as Buffer) */
  content: string | Buffer;
  
  /** Output format (svg or png) */
  format: RenderFormat;
  
  /** File extension for output file (e.g., ".svg", ".png") */
  extension: string;
}
