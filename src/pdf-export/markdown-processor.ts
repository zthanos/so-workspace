/**
 * Markdown processing functionality for PDF export
 */

import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItTOC from 'markdown-it-table-of-contents';
import markdownItAttrs from 'markdown-it-attrs';
import * as fs from 'fs-extra';
import * as path from 'path';
import { MarkdownOptions } from './types';

/**
 * Convert markdown files to HTML with TOC, section numbering, and embedded resources
 * 
 * @param workspaceRoot - Absolute path to workspace root
 * @param inputFiles - Array of input markdown file paths (relative to workspace root)
 * @param options - Markdown processing options
 * @returns Complete HTML string with all markdown files processed
 */
export async function convertMarkdownToHtml(
  workspaceRoot: string,
  inputFiles: string[],
  options: MarkdownOptions
): Promise<string> {
  // Configure markdown-it with plugins
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  })
    .use(markdownItAnchor, {
      permalink: false,
      level: [1, 2, 3]
    })
    .use(markdownItTOC, {
      includeLevel: [1, 2, 3],
      containerClass: 'toc-page'
    })
    .use(markdownItAttrs);

  // Add section numbering if enabled
  if (options.numberSections) {
    addSectionNumbering(md);
  }

  // Add custom image renderer to wrap images in figure with caption
  addImageCaptions(md);

  // Process all input files in order
  const htmlParts: string[] = [];
  
  for (const inputFile of inputFiles) {
    const filePath = path.join(workspaceRoot, inputFile);
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Strip YAML front matter if present
    const markdownContent = stripYamlFrontMatter(content);
    
    // Convert to HTML
    const html = md.render(markdownContent);
    htmlParts.push(html);
  }

  // Combine all HTML parts
  let combinedHtml = htmlParts.join('\n\n');
  
  // Embed images if self-contained option is enabled
  if (options.selfContained) {
    combinedHtml = await embedImages(workspaceRoot, combinedHtml, options.resourcePaths);
  }
  
  return combinedHtml;
}

/**
 * Add custom image renderer to wrap images in figure with caption
 * 
 * @param md - MarkdownIt instance
 */
function addImageCaptions(md: MarkdownIt): void {
  // Store the default image renderer
  const defaultImageRender = md.renderer.rules.image || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  // Override the image renderer
  md.renderer.rules.image = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const altText = token.content;
    const src = token.attrGet('src');
    const title = token.attrGet('title');

    // If there's alt text, wrap in figure with figcaption
    if (altText && altText.trim()) {
      let html = '<figure>\n';
      html += `  <img src="${escapeHtml(src || '')}"`;
      html += ` alt="${escapeHtml(altText)}"`;
      if (title) {
        html += ` title="${escapeHtml(title)}"`;
      }
      html += ' />\n';
      html += `  <figcaption>${escapeHtml(altText)}</figcaption>\n`;
      html += '</figure>';
      return html;
    }

    // Otherwise, use default rendering
    return defaultImageRender(tokens, idx, options, env, self);
  };
}

/**
 * Escape HTML special characters
 * 
 * @param text - Text to escape
 * @returns Escaped text
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

/**
 * Strip YAML front matter from markdown content
 * 
 * @param content - Markdown content that may contain YAML front matter
 * @returns Markdown content without YAML front matter
 */
function stripYamlFrontMatter(content: string): string {
  // YAML front matter is delimited by --- at the start and end
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  return content.replace(frontMatterRegex, '');
}

/**
 * Add section numbering plugin to markdown-it
 * 
 * @param md - MarkdownIt instance
 */
function addSectionNumbering(md: MarkdownIt): void {
  // Track section numbers at each level
  const sectionNumbers: number[] = [0, 0, 0, 0, 0, 0];

  // Store section numbers in env for access during rendering
  md.core.ruler.push('section_numbering', (state) => {
    const tokens = state.tokens;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.type === 'heading_open') {
        const level = parseInt(token.tag.substring(1)); // Extract level from h1, h2, etc.

        // Update section numbers
        if (level >= 1 && level <= 6) {
          sectionNumbers[level - 1]++;
          // Reset deeper levels
          for (let j = level; j < 6; j++) {
            sectionNumbers[j] = 0;
          }
        }

        // Generate section number string (e.g., "1.2.3")
        const sectionNumber = sectionNumbers
          .slice(0, level)
          .filter(n => n > 0)
          .join('.');

        // Add section number as data attribute
        if (token.attrIndex('data-section') < 0) {
          token.attrPush(['data-section', sectionNumber]);
        }

        // Find the inline token (text content) and prepend section number
        if (i + 1 < tokens.length && tokens[i + 1].type === 'inline') {
          const inlineToken = tokens[i + 1];
          if (inlineToken.children && inlineToken.children.length > 0) {
            const firstChild = inlineToken.children[0];
            if (firstChild.type === 'text') {
              firstChild.content = `${sectionNumber} ${firstChild.content}`;
            }
          }
        }
      }
    }
    
    return true;
  });
}

/**
 * Embed images in HTML by converting them to base64 data URLs
 * 
 * @param workspaceRoot - Absolute path to workspace root
 * @param html - HTML content with image references
 * @param resourcePaths - Array of paths to search for images (relative to workspace root)
 * @returns HTML with images embedded as data URLs
 */
async function embedImages(
  workspaceRoot: string,
  html: string,
  resourcePaths: string[]
): Promise<string> {
  // Parse image references from HTML
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
  let match;
  const imageReplacements: Array<{ original: string; dataUrl: string }> = [];

  while ((match = imgRegex.exec(html)) !== null) {
    const fullImgTag = match[0];
    const imgSrc = match[1];

    // Skip if already a data URL
    if (imgSrc.startsWith('data:')) {
      continue;
    }

    // Skip if absolute URL
    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
      continue;
    }

    // Try to resolve image from resource paths
    const resolvedPath = await resolveImagePath(workspaceRoot, imgSrc, resourcePaths);

    if (resolvedPath) {
      // Convert to base64 data URL
      const dataUrl = await imageToDataUrl(resolvedPath);
      
      // Create replacement with data URL
      const newImgTag = fullImgTag.replace(imgSrc, dataUrl);
      imageReplacements.push({ original: fullImgTag, dataUrl: newImgTag });
    }
  }

  // Apply all replacements
  let result = html;
  for (const replacement of imageReplacements) {
    result = result.replace(replacement.original, replacement.dataUrl);
  }

  return result;
}

/**
 * Resolve image path by searching in resource directories
 * 
 * @param workspaceRoot - Absolute path to workspace root
 * @param imgSrc - Image source path from HTML
 * @param resourcePaths - Array of paths to search for images
 * @returns Absolute path to image file, or null if not found
 */
async function resolveImagePath(
  workspaceRoot: string,
  imgSrc: string,
  resourcePaths: string[]
): Promise<string | null> {
  // Remove leading slash if present
  const cleanSrc = imgSrc.startsWith('/') ? imgSrc.substring(1) : imgSrc;

  // Try each resource path in order
  for (const resourcePath of resourcePaths) {
    const fullPath = path.join(workspaceRoot, resourcePath, cleanSrc);
    
    if (await fs.pathExists(fullPath)) {
      return fullPath;
    }
  }

  // Try relative to workspace root as fallback
  const fallbackPath = path.join(workspaceRoot, cleanSrc);
  if (await fs.pathExists(fallbackPath)) {
    return fallbackPath;
  }

  return null;
}

/**
 * Convert image file to base64 data URL
 * 
 * @param imagePath - Absolute path to image file
 * @returns Data URL string
 */
async function imageToDataUrl(imagePath: string): Promise<string> {
  const imageBuffer = await fs.readFile(imagePath);
  const base64 = imageBuffer.toString('base64');
  
  // Determine MIME type from file extension
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp'
  };
  
  const mimeType = mimeTypes[ext] || 'image/png';
  
  return `data:${mimeType};base64,${base64}`;
}
