/**
 * Basic test to verify Jest and fast-check setup
 */
import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import type {
  ManifestConfig,
  ProjectInfo,
  PdfOptions,
  TemplateData,
  ValidationResult,
  MarkdownOptions,
} from './types';

describe('PDF Export Types', () => {
  it('should verify Jest is working', () => {
    expect(true).toBe(true);
  });

  it('should verify fast-check is working', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n; // Identity property
      })
    );
  });

  it('should create valid ManifestConfig objects', () => {
    const config: ManifestConfig = {
      title: 'Test Document',
      inputs: ['file1.md', 'file2.md'],
    };
    expect(config.title).toBe('Test Document');
    expect(config.inputs).toHaveLength(2);
  });

  it('should create valid ProjectInfo objects', () => {
    const info: ProjectInfo = {
      projectId: 'PRJ-001',
      projectName: 'Test Project',
      author: 'Test Author',
      periodWritten: '2024-01',
      changes: 'Initial version',
    };
    expect(info.projectId).toBe('PRJ-001');
    expect(info.projectName).toBe('Test Project');
  });

  it('should create valid PdfOptions objects', () => {
    const options: PdfOptions = {
      format: 'A4',
      margins: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: '<div>Header</div>',
      footerTemplate: '<div>Footer</div>',
      printBackground: true,
      outline: true,
      outlineDepth: 3,
    };
    expect(options.format).toBe('A4');
    expect(options.margins.top).toBe('20mm');
  });

  it('should create valid TemplateData objects', () => {
    const data: TemplateData = {
      projectId: 'PRJ-001',
      projectName: 'Test Project',
      documentType: 'Solution Outline',
      author: 'Test Author',
      periodWritten: '2024-01',
      changes: 'Initial version',
      content: '<p>Test content</p>',
    };
    expect(data.documentType).toBe('Solution Outline');
    expect(data.content).toBe('<p>Test content</p>');
  });

  it('should create valid ValidationResult objects', () => {
    const result: ValidationResult = {
      valid: false,
      missingFiles: ['file1.md', 'file2.md'],
    };
    expect(result.valid).toBe(false);
    expect(result.missingFiles).toHaveLength(2);
  });

  it('should create valid MarkdownOptions objects', () => {
    const options: MarkdownOptions = {
      toc: true,
      tocDepth: 3,
      numberSections: true,
      resourcePaths: ['docs/', 'docs/diagrams/'],
      selfContained: true,
    };
    expect(options.toc).toBe(true);
    expect(options.tocDepth).toBe(3);
    expect(options.resourcePaths).toHaveLength(2);
  });
});
