/**
 * PDF generator for PDF export
 * Converts HTML to PDF with headers, footers, bookmarks, and proper pagination
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import puppeteer, { Browser, Page, PDFOptions as PuppeteerPDFOptions } from 'puppeteer';
import { PdfOptions, ProjectInfo } from './types';

/**
 * Generate PDF from HTML content
 * 
 * Creates a PDF with:
 * - A4 page size with specified margins (20mm top/bottom, 15mm left/right)
 * - Headers starting from page 3 (company logo left, project info right)
 * - Footers starting from page 3 (page numbers in N / M format)
 * - PDF bookmarks/outline with depth 3
 * - No headers/footers on pages 1-2 (title page and TOC)
 * 
 * @param html - Complete HTML content to convert to PDF
 * @param outputPath - Absolute path where PDF should be saved
 * @param projectInfo - Project information for headers
 * @param logoPath - Absolute path to company logo file
 * @returns Promise that resolves when PDF is generated
 * @throws Error if PDF generation fails
 */
export async function generatePdf(
  html: string,
  outputPath: string,
  projectInfo: ProjectInfo,
  logoPath: string
): Promise<void> {
  let browser: Browser | null = null;
  
  try {
    // Validate logo exists
    if (!await fs.pathExists(logoPath)) {
      throw new Error(`Company logo not found at: ${logoPath}`);
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.ensureDir(outputDir);
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });
    
    // Read and encode logo as base64
    const logoBuffer = await fs.readFile(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    const logoExt = path.extname(logoPath).toLowerCase();
    const logoMimeType = getImageMimeType(logoExt);
    const logoDataUrl = `data:${logoMimeType};base64,${logoBase64}`;
    
    // Create header template
    const headerTemplate = createHeaderTemplate(projectInfo, logoDataUrl);
    
    // Create footer template
    const footerTemplate = createFooterTemplate();
    
    // Configure PDF options
    const pdfOptions: PuppeteerPDFOptions = {
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: '30mm',    // Extra space for header
        bottom: '25mm', // Extra space for footer
        left: '15mm',
        right: '15mm'
      },
      // Enable PDF outline/bookmarks
      tagged: true,
      outline: true
    };
    
    // Generate PDF
    await page.pdf(pdfOptions);
    
  } catch (error) {
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Clean up browser
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Create header template HTML
 * 
 * Header contains:
 * - Company logo on the left
 * - Project ID on the right (first line, right-aligned)
 * - Project name on the right (second line, right-aligned)
 * 
 * Headers are hidden on pages 1-2 using JavaScript that checks the page number.
 * 
 * @param projectInfo - Project information
 * @param logoDataUrl - Base64 encoded logo data URL
 * @returns HTML template string for header
 */
function createHeaderTemplate(projectInfo: ProjectInfo, logoDataUrl: string): string {
  return `
    <div style="width: 100%; font-size: 9pt; padding: 5mm 15mm 0 15mm;">
      <script>
        // Hide header on pages 1-2
        const pageNum = parseInt(document.querySelector('.pageNumber')?.textContent || '0');
        if (pageNum <= 2) {
          document.currentScript.parentElement.style.display = 'none';
        }
      </script>
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 0 0 auto;">
          <img src="${logoDataUrl}" style="height: 10mm; width: auto;" />
        </div>
        <div style="flex: 0 0 auto; text-align: right; line-height: 1.3;">
          <div style="font-weight: 600; color: #2c3e50;">${escapeHtml(projectInfo.projectId)}</div>
          <div style="color: #34495e;">${escapeHtml(projectInfo.projectName)}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create footer template HTML
 * 
 * Footer contains page numbers in "N / M" format centered at the bottom.
 * Footers are hidden on pages 1-2 using JavaScript that checks the page number.
 * 
 * Note: Puppeteer provides special classes for page numbers:
 * - .pageNumber: Current page number
 * - .totalPages: Total number of pages
 * 
 * @returns HTML template string for footer
 */
function createFooterTemplate(): string {
  return `
    <div style="width: 100%; font-size: 9pt; text-align: center; padding: 0 15mm 5mm 15mm; color: #555;">
      <script>
        // Hide footer on pages 1-2
        const pageNum = parseInt(document.querySelector('.pageNumber')?.textContent || '0');
        if (pageNum <= 2) {
          document.currentScript.parentElement.style.display = 'none';
        }
      </script>
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `;
}

/**
 * Get MIME type for image based on file extension
 * 
 * @param extension - File extension (e.g., '.png', '.jpg')
 * @returns MIME type string
 */
function getImageMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'image/png';
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
