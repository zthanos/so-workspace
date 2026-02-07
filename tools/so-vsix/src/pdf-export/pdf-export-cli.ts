#!/usr/bin/env node

/**
 * CLI entry point for PDF export
 * 
 * This script provides a command-line interface for the PDF export functionality.
 * It can be invoked via npm scripts and will automatically locate the workspace root.
 * 
 * Usage:
 *   npm run export:pdf
 *   node pdf-export-cli.js
 * 
 * Exit codes:
 *   0 - Success
 *   1 - Error occurred during PDF generation
 */

import { exportPdf } from './index';

// Parse command line arguments if needed in the future
// Currently no arguments are required as the system auto-discovers configuration
const args = process.argv.slice(2);

// Display help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
PDF Export CLI

Usage:
  npm run export:pdf
  node pdf-export-cli.js

Description:
  Generates a PDF document from markdown sources defined in docs/manifest.yml.
  The script automatically locates the workspace root and processes all configured files.

Features:
  - Professional title page with project information
  - Table of contents (3 levels deep)
  - Section numbering
  - Headers with company logo and project info
  - Page numbers in footer
  - PDF bookmarks for navigation
  - Embedded diagrams and images
  - Custom styling and formatting

Requirements:
  - docs/manifest.yml must exist with title and inputs fields
  - docs/project_information.md must exist with project metadata
  - All input files listed in manifest.yml must exist
  - Company logo must exist at templates/logo.png

Exit Codes:
  0 - PDF generated successfully
  1 - Error occurred during generation

For more information, see the documentation in the templates folder.
  `);
  process.exit(0);
}

// Call the main export function
// The exportPdf function handles all error cases and process.exit calls
exportPdf();
