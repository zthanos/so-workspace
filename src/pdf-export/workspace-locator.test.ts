import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as fc from 'fast-check';
import { findWorkspaceRoot } from './workspace-locator';

describe('Workspace Locator', () => {
  let tempDir: string;
  let testWorkspaceRoot: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should find workspace root when docs/manifest.yml exists in current directory', () => {
    // Setup: Create docs/manifest.yml in temp directory
    const docsDir = path.join(tempDir, 'docs');
    fs.mkdirSync(docsDir);
    fs.writeFileSync(path.join(docsDir, 'manifest.yml'), 'title: Test');

    // Test: Should find the workspace root
    const result = findWorkspaceRoot(tempDir);
    expect(result).toBe(tempDir);
  });

  it('should find workspace root when starting from subdirectory', () => {
    // Setup: Create docs/manifest.yml and a subdirectory
    const docsDir = path.join(tempDir, 'docs');
    fs.mkdirSync(docsDir);
    fs.writeFileSync(path.join(docsDir, 'manifest.yml'), 'title: Test');
    
    const subDir = path.join(tempDir, 'tools', 'so-vsix', 'src');
    fs.mkdirSync(subDir, { recursive: true });

    // Test: Should find workspace root from subdirectory
    const result = findWorkspaceRoot(subDir);
    expect(result).toBe(tempDir);
  });

  it('should find workspace root up to 8 levels up', () => {
    // Setup: Create docs/manifest.yml at root
    const docsDir = path.join(tempDir, 'docs');
    fs.mkdirSync(docsDir);
    fs.writeFileSync(path.join(docsDir, 'manifest.yml'), 'title: Test');
    
    // Create a deeply nested directory (7 levels deep from root)
    // This means we need to go up 7 times to reach the root
    const deepDir = path.join(tempDir, 'a', 'b', 'c', 'd', 'e', 'f', 'g');
    fs.mkdirSync(deepDir, { recursive: true });

    // Test: Should find workspace root from 7 levels deep
    const result = findWorkspaceRoot(deepDir);
    expect(result).toBe(tempDir);
  });

  it('should throw error when docs/manifest.yml not found within 8 levels', () => {
    // Setup: Create a deeply nested directory without manifest
    const deepDir = path.join(tempDir, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i');
    fs.mkdirSync(deepDir, { recursive: true });

    // Test: Should throw error
    expect(() => findWorkspaceRoot(deepDir)).toThrow(
      'Cannot locate workspace root (expected docs/manifest.yml)'
    );
  });

  it('should throw error when docs/manifest.yml does not exist', () => {
    // Setup: Empty directory
    // Test: Should throw error
    expect(() => findWorkspaceRoot(tempDir)).toThrow(
      'Cannot locate workspace root (expected docs/manifest.yml)'
    );
  });

  it('should return absolute path', () => {
    // Setup: Create docs/manifest.yml
    const docsDir = path.join(tempDir, 'docs');
    fs.mkdirSync(docsDir);
    fs.writeFileSync(path.join(docsDir, 'manifest.yml'), 'title: Test');

    // Test: Should return absolute path
    const result = findWorkspaceRoot(tempDir);
    expect(path.isAbsolute(result)).toBe(true);
  });

  it('should work with actual project structure', () => {
    // This test uses the actual project structure
    // Starting from the test file location, it should find the workspace root
    const currentDir = __dirname;
    
    // This should find the actual workspace root
    const result = findWorkspaceRoot(currentDir);
    
    // Verify that the result contains docs/manifest.yml
    const manifestPath = path.join(result, 'docs', 'manifest.yml');
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  // Feature: pdf-export-npm, Property 1: Workspace Root Discovery
  it('should find workspace root for any directory structure with manifest within 8 levels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 7 }), // Depth from 0 to 7 levels
        fc.array(fc.stringMatching(/^[a-z0-9_-]+$/), { minLength: 1, maxLength: 3 }), // Directory names
        (depth, dirNames) => {
          // Create a temporary workspace for this test
          const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prop-test-'));
          
          try {
            // Create docs/manifest.yml at root
            const docsDir = path.join(testRoot, 'docs');
            fs.mkdirSync(docsDir);
            fs.writeFileSync(path.join(docsDir, 'manifest.yml'), 'title: Test');
            
            // Create nested directory structure based on depth
            let currentPath = testRoot;
            for (let i = 0; i < depth; i++) {
              const dirName = dirNames[i % dirNames.length] || 'subdir';
              currentPath = path.join(currentPath, dirName);
              fs.mkdirSync(currentPath, { recursive: true });
            }
            
            // Test: Should find workspace root from any depth within 8 levels
            const result = findWorkspaceRoot(currentPath);
            
            // Verify the result is the test root
            return result === testRoot;
          } finally {
            // Cleanup
            if (fs.existsSync(testRoot)) {
              fs.rmSync(testRoot, { recursive: true, force: true });
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: pdf-export-npm, Property 1: Workspace Root Discovery (error case)
  it('should throw error for any directory structure without manifest or beyond 8 levels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 9, max: 12 }), // Depth beyond 8 levels
        (depth) => {
          // Create a temporary workspace for this test
          const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prop-test-fail-'));
          
          try {
            // Create nested directory structure without manifest
            let currentPath = testRoot;
            for (let i = 0; i < depth; i++) {
              currentPath = path.join(currentPath, `level${i}`);
              fs.mkdirSync(currentPath, { recursive: true });
            }
            
            // Test: Should throw error when manifest not found within 8 levels
            let errorThrown = false;
            try {
              findWorkspaceRoot(currentPath);
            } catch (error) {
              errorThrown = true;
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('Cannot locate workspace root');
            }
            
            return errorThrown;
          } finally {
            // Cleanup
            if (fs.existsSync(testRoot)) {
              fs.rmSync(testRoot, { recursive: true, force: true });
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
