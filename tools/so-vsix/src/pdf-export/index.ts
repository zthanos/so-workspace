/**
 * Main orchestrator for PDF export
 * Coordinates all components to generate PDF from markdown sources
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { findWorkspaceRoot } from './workspace-locator';
import { parseManifest, parseProjectInfo } from './config-parser';
import { validateInputFiles, validateAssets } from './file-validator';
import { convertMarkdownToHtml } from './markdown-processor';
import { applyTemplate } from './template-processor';
import { getOrCreateStylesheet, embedStylesheet } from './style-manager';
import { generatePdf } from './pdf-generator';
import { MarkdownOptions, TemplateData } from './types';

/**
 * Main PDF export function
 * 
 * Orchestrates the complete PDF generation workflow:
 * 1. Locate workspace root
 * 2. Parse manifest and project information
 * 3. Validate all input files and assets
 * 4. Convert markdown to HTML
 * 5. Apply document template
 * 6. Apply CSS styling
 * 7. Generate PDF
 * 8. Display success message
 * 
 * @returns Promise that resolves when PDF is generated successfully
 * @throws Error with descriptive message if any step fails
 */
export async function exportPdf(): Promise<void> {
  try {
    console.log('Starting PDF export...\n');
    
    // Step 1: Locate workspace root
    console.log('Locating workspace root...');
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    console.log(`✓ Workspace root found: ${workspaceRoot}\n`);
    
    // Step 2: Parse manifest configuration
    console.log('Parsing manifest configuration...');
    const manifestPath = path.join(workspaceRoot, 'docs', 'manifest.yml');
    const manifest = parseManifest(manifestPath);
    console.log(`✓ Manifest parsed: ${manifest.inputs.length} input files\n`);
    
    // Step 3: Parse project information
    console.log('Loading project information...');
    const projectInfoPath = path.join(workspaceRoot, 'docs', 'project_information.md');
    const projectInfo = parseProjectInfo(projectInfoPath);
    console.log(`✓ Project info loaded: ${projectInfo.projectId} - ${projectInfo.projectName}\n`);
    
    // Step 4: Validate input files
    console.log('Validating input files...');
    const inputValidation = validateInputFiles(workspaceRoot, manifest.inputs);
    
    if (!inputValidation.valid) {
      throw new Error(
        `Missing input files:\n${inputValidation.missingFiles.map(f => `  - ${f}`).join('\n')}\n` +
        `Ensure all files listed in docs/manifest.yml exist in the workspace.`
      );
    }
    console.log(`✓ All ${manifest.inputs.length} input files validated\n`);
    
    // Step 5: Validate assets (company logo)
    console.log('Validating assets...');
    const logoPath = 'docs/assets/logo.png'; // Default logo path
    const assetValidation = validateAssets(workspaceRoot, logoPath);
    
    if (!assetValidation.valid) {
      throw new Error(
        `Missing required assets:\n${assetValidation.missingFiles.map(f => `  - ${f}`).join('\n')}\n` +
        `Ensure the company logo exists at: ${logoPath}`
      );
    }
    console.log(`✓ Assets validated\n`);
    
    // Step 6: Convert markdown to HTML
    console.log('Converting markdown to HTML...');
    const markdownOptions: MarkdownOptions = {
      toc: true,
      tocDepth: 3,
      numberSections: true,
      resourcePaths: [
        'docs',
        'docs/03_architecture/diagrams/out'
      ],
      selfContained: true
    };
    
    const htmlContent = await convertMarkdownToHtml(
      workspaceRoot,
      manifest.inputs,
      markdownOptions
    );
    console.log(`✓ Markdown converted to HTML\n`);
    
    // Step 7: Apply document template
    console.log('Applying document template...');
    const templatesDir = path.join(workspaceRoot, 'templates');
    
    // Read and encode logo for title page
    const absoluteLogoPath = path.join(workspaceRoot, logoPath);
    const logoBuffer = await fs.readFile(absoluteLogoPath);
    const logoBase64 = logoBuffer.toString('base64');
    const logoExt = path.extname(logoPath).toLowerCase();
    const logoMimeType = logoExt === '.png' ? 'image/png' : 
                         logoExt === '.jpg' || logoExt === '.jpeg' ? 'image/jpeg' : 
                         'image/png';
    const logoDataUrl = `data:${logoMimeType};base64,${logoBase64}`;
    
    const templateData: TemplateData = {
      projectId: projectInfo.projectId,
      projectName: projectInfo.projectName,
      documentType: 'Solution Outline',
      author: projectInfo.author,
      periodWritten: projectInfo.periodWritten,
      changes: projectInfo.changes,
      content: htmlContent
    };
    
    const templatedHtml = await applyTemplate(templatesDir, templateData, logoDataUrl);
    console.log(`✓ Document template applied\n`);
    
    // Step 8: Apply CSS styling
    console.log('Applying CSS styling...');
    const css = getOrCreateStylesheet(templatesDir);
    const styledHtml = embedStylesheet(templatedHtml, css);
    console.log(`✓ CSS styling applied\n`);
    
    // Step 9: Create output directory
    console.log('Preparing output directory...');
    const outputDir = path.join(workspaceRoot, 'docs', 'build', 'pdf');
    await fs.ensureDir(outputDir);
    console.log(`✓ Output directory ready: ${outputDir}\n`);
    
    // Step 10: Generate PDF
    console.log('Generating PDF...');
    const outputPath = path.join(outputDir, 'Full_Doc.pdf');
    
    await generatePdf(styledHtml, outputPath, projectInfo, absoluteLogoPath);
    console.log(`✓ PDF generated successfully\n`);
    
    // Step 11: Display success message
    console.log('═══════════════════════════════════════════════════════');
    console.log('PDF Export Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Output: ${outputPath}`);
    console.log('');
    console.log('Features included:');
    console.log('  ✓ Professional title page with project information');
    console.log('  ✓ Table of contents (3 levels deep)');
    console.log('  ✓ Section numbering');
    console.log('  ✓ Headers with company logo and project info (pages 3+)');
    console.log('  ✓ Page numbers in footer (pages 3+)');
    console.log('  ✓ PDF bookmarks for navigation');
    console.log('  ✓ Embedded diagrams and images');
    console.log('  ✓ Custom styling and formatting');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Exit with success code
    process.exit(0);
    
  } catch (error) {
    // Handle errors with descriptive messages
    console.error('\n═══════════════════════════════════════════════════════');
    console.error('PDF Export Failed');
    console.error('═══════════════════════════════════════════════════════');
    
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      
      // Add context based on error type
      if (error.message.includes('Cannot locate workspace root')) {
        console.error('\nContext: Workspace root discovery failed');
        console.error('Suggestion: Ensure you\'re running from within the project directory');
      } else if (error.message.includes('Manifest file not found')) {
        console.error('\nContext: Configuration file missing');
        console.error('Suggestion: Create docs/manifest.yml with title and inputs fields');
      } else if (error.message.includes('Project information file not found')) {
        console.error('\nContext: Project metadata missing');
        console.error('Suggestion: Create docs/project_information.md with required fields');
      } else if (error.message.includes('Missing input files')) {
        console.error('\nContext: Input file validation failed');
        console.error('Suggestion: Ensure all files in manifest.yml exist');
      } else if (error.message.includes('Missing required assets')) {
        console.error('\nContext: Asset validation failed');
        console.error('Suggestion: Add company logo at docs/assets/logo.png');
      } else if (error.message.includes('PDF generation failed')) {
        console.error('\nContext: PDF generation stage');
        console.error('Suggestion: Check that all HTML content is valid');
      }
    } else {
      console.error(`Error: ${String(error)}`);
    }
    
    console.error('═══════════════════════════════════════════════════════\n');
    
    // Exit with error code
    process.exit(1);
  }
}

// Export for use as a module
export default exportPdf;
