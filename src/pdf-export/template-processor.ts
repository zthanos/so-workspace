/**
 * Template processor for PDF export
 * Applies document template with title page and project information
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { TemplateData } from './types';

/**
 * Apply document template to content
 * 
 * Generates a complete HTML document with:
 * - Title page with project ID, project name, and document type
 * - Document information table with period, changes, and author
 * - Page break after title page
 * - Main content
 * 
 * @param templatesDir - Absolute path to templates directory
 * @param data - Template data including project info and content
 * @param logoDataUrl - Base64 encoded logo data URL (optional)
 * @returns Complete HTML with template applied
 * @throws Error if template file is missing or processing fails
 */
export async function applyTemplate(
  templatesDir: string,
  data: TemplateData,
  logoDataUrl?: string
): Promise<string> {
  // Check if template file exists
  const templatePath = path.join(templatesDir, 'document_template.html');
  
  let templateContent: string;
  
  if (await fs.pathExists(templatePath)) {
    // Read existing template
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } else {
    // Use default template if file doesn't exist
    templateContent = getDefaultTemplate();
  }
  
  // Replace template variables
  let result = templateContent;
  
  // Clean project name - remove "Solution Outline" if present
  let cleanProjectName = data.projectName;
  cleanProjectName = cleanProjectName.replace(/\s*Solution Outline\s*/gi, '').trim();
  
  // Replace all template variables
  result = result.replace(/\{\{projectId\}\}/g, escapeHtml(data.projectId));
  result = result.replace(/\{\{projectName\}\}/g, escapeHtml(cleanProjectName));
  result = result.replace(/\{\{documentType\}\}/g, escapeHtml(data.documentType));
  result = result.replace(/\{\{author\}\}/g, escapeHtml(data.author));
  result = result.replace(/\{\{periodWritten\}\}/g, escapeHtml(data.periodWritten));
  result = result.replace(/\{\{changes\}\}/g, escapeHtml(data.changes));
  result = result.replace(/\{\{content\}\}/g, data.content);
  result = result.replace(/\{\{logoDataUrl\}\}/g, logoDataUrl || '');
  
  return result;
}

/**
 * Get default document template
 * 
 * @returns Default HTML template string
 */
function getDefaultTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{projectId}} - {{projectName}}</title>
</head>
<body>
  <!-- Title Page -->
  <div class="title-page">
    <div class="title-content">
      <h1 class="project-id">{{projectId}}</h1>
      <h2 class="project-name">{{projectName}}</h2>
      <h3 class="document-type">{{documentType}}</h3>
      <div class="title-logo">
        <img src="{{logoDataUrl}}" alt="Company Logo" />
      </div>
    </div>
    
    <table class="document-info">
      <tbody>
        <tr>
          <th>Period Written</th>
          <td>{{periodWritten}}</td>
        </tr>
        <tr>
          <th>Changes</th>
          <td>{{changes}}</td>
        </tr>
        <tr>
          <th>Author</th>
          <td>{{author}}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <!-- Page break after title page -->
  <div class="page-break"></div>
  
  <!-- Main Content -->
  <div class="main-content">
    {{content}}
  </div>
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent XSS
 * 
 * @param text - Text to escape
 * @returns Escaped text safe for HTML
 */
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
}
