/**
 * Tests for template processor
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { applyTemplate } from './template-processor';
import { TemplateData } from './types';

describe('Template Processor', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'template-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('applyTemplate', () => {
    it('should apply default template when template file does not exist', async () => {
      const data: TemplateData = {
        projectId: 'PRJ-001',
        projectName: 'Test Project',
        documentType: 'Solution Outline',
        author: 'John Doe',
        periodWritten: 'Q1 2024',
        changes: 'Initial version',
        content: '<p>Main content here</p>'
      };

      const result = await applyTemplate(tempDir, data);

      // Verify all template variables are replaced
      expect(result).toContain('PRJ-001');
      expect(result).toContain('Test Project');
      expect(result).toContain('Solution Outline');
      expect(result).toContain('John Doe');
      expect(result).toContain('Q1 2024');
      expect(result).toContain('Initial version');
      expect(result).toContain('<p>Main content here</p>');

      // Verify no template variables remain
      expect(result).not.toContain('{{projectId}}');
      expect(result).not.toContain('{{projectName}}');
      expect(result).not.toContain('{{documentType}}');
      expect(result).not.toContain('{{author}}');
      expect(result).not.toContain('{{periodWritten}}');
      expect(result).not.toContain('{{changes}}');
      expect(result).not.toContain('{{content}}');
    });

    it('should include title page structure', async () => {
      const data: TemplateData = {
        projectId: 'PRJ-001',
        projectName: 'Test Project',
        documentType: 'Solution Outline',
        author: 'John Doe',
        periodWritten: 'Q1 2024',
        changes: 'Initial version',
        content: '<p>Main content</p>'
      };

      const result = await applyTemplate(tempDir, data);

      // Verify title page elements
      expect(result).toContain('class="title-page"');
      expect(result).toContain('class="title-content"');
      expect(result).toContain('class="project-id"');
      expect(result).toContain('class="project-name"');
      expect(result).toContain('class="document-type"');
    });

    it('should include document information table', async () => {
      const data: TemplateData = {
        projectId: 'PRJ-001',
        projectName: 'Test Project',
        documentType: 'Solution Outline',
        author: 'John Doe',
        periodWritten: 'Q1 2024',
        changes: 'Initial version',
        content: '<p>Main content</p>'
      };

      const result = await applyTemplate(tempDir, data);

      // Verify document info table
      expect(result).toContain('class="document-info"');
      expect(result).toContain('Period Written');
      expect(result).toContain('Changes');
      expect(result).toContain('Author');
    });

    it('should include page break after title page', async () => {
      const data: TemplateData = {
        projectId: 'PRJ-001',
        projectName: 'Test Project',
        documentType: 'Solution Outline',
        author: 'John Doe',
        periodWritten: 'Q1 2024',
        changes: 'Initial version',
        content: '<p>Main content</p>'
      };

      const result = await applyTemplate(tempDir, data);

      // Verify page break
      expect(result).toContain('class="page-break"');
    });

    it('should escape HTML special characters in data', async () => {
      const data: TemplateData = {
        projectId: 'PRJ-001 <script>alert("xss")</script>',
        projectName: 'Test & Project',
        documentType: 'Solution "Outline"',
        author: "John O'Doe",
        periodWritten: 'Q1 2024',
        changes: 'Initial version',
        content: '<p>Main content</p>'
      };

      const result = await applyTemplate(tempDir, data);

      // Verify HTML is escaped (except in content)
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('Test &amp; Project');
      expect(result).toContain('Solution &quot;Outline&quot;');
      expect(result).toContain('John O&#39;Doe');

      // Content should not be escaped
      expect(result).toContain('<p>Main content</p>');
    });

    it('should use custom template file if it exists', async () => {
      // Create custom template
      const customTemplate = `<html>
<body>
  <h1>Custom: {{projectId}}</h1>
  <p>{{content}}</p>
</body>
</html>`;

      await fs.writeFile(
        path.join(tempDir, 'document_template.html'),
        customTemplate,
        'utf-8'
      );

      const data: TemplateData = {
        projectId: 'PRJ-001',
        projectName: 'Test Project',
        documentType: 'Solution Outline',
        author: 'John Doe',
        periodWritten: 'Q1 2024',
        changes: 'Initial version',
        content: '<p>Main content</p>'
      };

      const result = await applyTemplate(tempDir, data);

      // Verify custom template is used
      expect(result).toContain('Custom: PRJ-001');
      expect(result).toContain('<p>Main content</p>');
      expect(result).not.toContain('class="title-page"');
    });
  });
});
