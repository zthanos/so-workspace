/**
 * Tests for markdown processor
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import { convertMarkdownToHtml } from './markdown-processor';
import { MarkdownOptions } from './types';

describe('Markdown Processor', () => {
  const testDir = path.join(__dirname, 'test-workspace');
  const docsDir = path.join(testDir, 'docs');

  beforeAll(async () => {
    // Create test workspace
    await fs.ensureDir(docsDir);
  });

  afterAll(async () => {
    // Clean up test workspace
    await fs.remove(testDir);
  });

  it('should convert simple markdown to HTML', async () => {
    // Create test markdown file
    const testFile = 'test.md';
    const testContent = '# Hello World\n\nThis is a test.';
    await fs.writeFile(path.join(docsDir, testFile), testContent);

    const options: MarkdownOptions = {
      toc: false,
      tocDepth: 3,
      numberSections: false,
      resourcePaths: ['docs'],
      selfContained: false
    };

    const html = await convertMarkdownToHtml(testDir, [`docs/${testFile}`], options);

    expect(html).toContain('<h1');
    expect(html).toContain('Hello World');
    expect(html).toContain('<p>This is a test.</p>');
  });

  it('should process multiple files in order', async () => {
    // Create test markdown files
    const file1 = 'file1.md';
    const file2 = 'file2.md';
    await fs.writeFile(path.join(docsDir, file1), '# File 1\n\nFirst file.');
    await fs.writeFile(path.join(docsDir, file2), '# File 2\n\nSecond file.');

    const options: MarkdownOptions = {
      toc: false,
      tocDepth: 3,
      numberSections: false,
      resourcePaths: ['docs'],
      selfContained: false
    };

    const html = await convertMarkdownToHtml(
      testDir,
      [`docs/${file1}`, `docs/${file2}`],
      options
    );

    const file1Index = html.indexOf('File 1');
    const file2Index = html.indexOf('File 2');

    expect(file1Index).toBeGreaterThan(-1);
    expect(file2Index).toBeGreaterThan(-1);
    expect(file1Index).toBeLessThan(file2Index);
  });

  it('should strip YAML front matter', async () => {
    // Create test markdown file with YAML front matter
    const testFile = 'with-frontmatter.md';
    const testContent = `---
title: Test Document
author: Test Author
---

# Content

This is the actual content.`;
    await fs.writeFile(path.join(docsDir, testFile), testContent);

    const options: MarkdownOptions = {
      toc: false,
      tocDepth: 3,
      numberSections: false,
      resourcePaths: ['docs'],
      selfContained: false
    };

    const html = await convertMarkdownToHtml(testDir, [`docs/${testFile}`], options);

    expect(html).not.toContain('title: Test Document');
    expect(html).not.toContain('author: Test Author');
    expect(html).toContain('Content');
    expect(html).toContain('This is the actual content.');
  });

  it('should add section numbering when enabled', async () => {
    // Create test markdown file with headings
    const testFile = 'numbered.md';
    const testContent = `# First Heading

## Second Level

### Third Level

## Another Second Level`;
    await fs.writeFile(path.join(docsDir, testFile), testContent);

    const options: MarkdownOptions = {
      toc: false,
      tocDepth: 3,
      numberSections: true,
      resourcePaths: ['docs'],
      selfContained: false
    };

    const html = await convertMarkdownToHtml(testDir, [`docs/${testFile}`], options);

    expect(html).toContain('1 First Heading');
    expect(html).toContain('1.1 Second Level');
    expect(html).toContain('1.1.1 Third Level');
    expect(html).toContain('1.2 Another Second Level');
  });

  it('should embed images when selfContained is true', async () => {
    // Create test image
    const imgDir = path.join(docsDir, 'images');
    await fs.ensureDir(imgDir);
    const imgPath = path.join(imgDir, 'test.png');
    
    // Create a simple 1x1 PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fs.writeFile(imgPath, pngBuffer);

    // Create markdown with image reference
    const testFile = 'with-image.md';
    const testContent = '# Test\n\n![Test Image](images/test.png)';
    await fs.writeFile(path.join(docsDir, testFile), testContent);

    const options: MarkdownOptions = {
      toc: false,
      tocDepth: 3,
      numberSections: false,
      resourcePaths: ['docs'],
      selfContained: true
    };

    const html = await convertMarkdownToHtml(testDir, [`docs/${testFile}`], options);

    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toContain('images/test.png');
  });

  it('should generate table of contents when enabled', async () => {
    // Create test markdown file with multiple headings
    const testFile = 'with-toc.md';
    const testContent = `[[toc]]

# Introduction

This is the introduction section.

## Background

Some background information.

### Details

More detailed information.

## Objectives

The objectives of this document.

# Main Content

The main content section.

## Section 1

First section content.

## Section 2

Second section content.`;
    await fs.writeFile(path.join(docsDir, testFile), testContent);

    const options: MarkdownOptions = {
      toc: true,
      tocDepth: 3,
      numberSections: false,
      resourcePaths: ['docs'],
      selfContained: false
    };

    const html = await convertMarkdownToHtml(testDir, [`docs/${testFile}`], options);

    // Verify TOC container is present
    expect(html).toContain('toc-page');
    
    // Verify TOC contains links to headings
    expect(html).toContain('Introduction');
    expect(html).toContain('Background');
    expect(html).toContain('Objectives');
    expect(html).toContain('Main Content');
    
    // Verify actual content is also present
    expect(html).toContain('This is the introduction section');
    expect(html).toContain('Some background information');
  });
});
