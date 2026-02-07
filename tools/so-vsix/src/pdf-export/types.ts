/**
 * Type definitions for PDF Export functionality
 */

/**
 * Configuration parsed from manifest.yml
 */
export interface ManifestConfig {
  /** Document title from manifest.yml */
  title: string;
  /** Array of input markdown file paths */
  inputs: string[];
}

/**
 * Project information parsed from project_information.md
 */
export interface ProjectInfo {
  /** Unique project identifier */
  projectId: string;
  /** Full project name */
  projectName: string;
  /** Document author(s) */
  author: string;
  /** Time period or date written */
  periodWritten: string;
  /** Version history or change log */
  changes: string;
}

/**
 * Options for PDF generation
 */
export interface PdfOptions {
  /** Page format (e.g., 'A4') */
  format: 'A4';
  /** Page margins */
  margins: {
    /** Top margin (e.g., '20mm') */
    top: string;
    /** Bottom margin (e.g., '20mm') */
    bottom: string;
    /** Left margin (e.g., '15mm') */
    left: string;
    /** Right margin (e.g., '15mm') */
    right: string;
  };
  /** Whether to display header and footer */
  displayHeaderFooter: boolean;
  /** HTML template for header */
  headerTemplate: string;
  /** HTML template for footer */
  footerTemplate: string;
  /** Whether to print background graphics */
  printBackground: boolean;
  /** Whether to generate PDF outline/bookmarks */
  outline: boolean;
  /** Depth of outline/bookmarks */
  outlineDepth: number;
}

/**
 * Data for template processing
 */
export interface TemplateData {
  /** Unique project identifier */
  projectId: string;
  /** Full project name */
  projectName: string;
  /** Document type (e.g., "Solution Outline") */
  documentType: string;
  /** Document author(s) */
  author: string;
  /** Time period or date written */
  periodWritten: string;
  /** Version history or change log */
  changes: string;
  /** Main HTML content */
  content: string;
}

/**
 * Result of file validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of missing files */
  missingFiles: string[];
}

/**
 * Options for markdown processing
 */
export interface MarkdownOptions {
  /** Whether to generate table of contents */
  toc: boolean;
  /** Depth of table of contents */
  tocDepth: number;
  /** Whether to number sections */
  numberSections: boolean;
  /** Paths to search for resources (images, etc.) */
  resourcePaths: string[];
  /** Whether to create self-contained HTML */
  selfContained: boolean;
}
