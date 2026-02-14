/**
 * Unit tests for types and constants
 */

import { DEFAULT_CONFIG, EXTENSION_MAP } from './types';

describe('Diagram Previewer Types', () => {
  test('DEFAULT_CONFIG should have correct values', () => {
    expect(DEFAULT_CONFIG.autoOpenPreview).toBe(false);
    expect(DEFAULT_CONFIG.debounceDelay).toBe(300);
    expect(DEFAULT_CONFIG.cacheSize).toBe(50);
    expect(DEFAULT_CONFIG.krokiEndpoint).toBe('https://kroki.io');
    expect(DEFAULT_CONFIG.krokiRateLimit).toBe(500);
    expect(DEFAULT_CONFIG.mermaidTheme.light).toBe('default');
    expect(DEFAULT_CONFIG.mermaidTheme.dark).toBe('dark');
  });

  test('EXTENSION_MAP should map mermaid extensions correctly', () => {
    expect(EXTENSION_MAP['.mmd'].renderer).toBe('mermaid');
    expect(EXTENSION_MAP['.mermaid'].renderer).toBe('mermaid');
  });

  test('EXTENSION_MAP should map kroki extensions correctly', () => {
    expect(EXTENSION_MAP['.dsl'].renderer).toBe('kroki');
    expect(EXTENSION_MAP['.dsl'].diagramType).toBe('structurizr');
    
    expect(EXTENSION_MAP['.puml'].renderer).toBe('kroki');
    expect(EXTENSION_MAP['.puml'].diagramType).toBe('plantuml');
    
    expect(EXTENSION_MAP['.dot'].renderer).toBe('kroki');
    expect(EXTENSION_MAP['.dot'].diagramType).toBe('graphviz');
  });

  test('EXTENSION_MAP should include all common diagram types', () => {
    const extensions = Object.keys(EXTENSION_MAP);
    expect(extensions).toContain('.mmd');
    expect(extensions).toContain('.puml');
    expect(extensions).toContain('.dot');
    expect(extensions).toContain('.dsl');
  });
});


describe('Configuration Validation', () => {
  // Import validateConfig dynamically to avoid vscode import issues
  const { validateConfig } = require('./config-validator');
  
  test('should validate default configuration without errors', () => {
    const errors = validateConfig(DEFAULT_CONFIG);
    expect(errors).toHaveLength(0);
  });

  test('should reject negative debounce delay', () => {
    const config = {
      ...DEFAULT_CONFIG,
      debounceDelay: -100,
    };
    const errors = validateConfig(config);
    expect(errors).toContain('debounceDelay must be non-negative');
  });

  test('should reject invalid Kroki endpoint URL', () => {
    const config = {
      ...DEFAULT_CONFIG,
      krokiEndpoint: 'not-a-valid-url',
    };
    const errors = validateConfig(config);
    expect(errors).toContain('krokiEndpoint must be a valid URL');
  });

  test('should accept valid configuration', () => {
    const config = {
      ...DEFAULT_CONFIG,
      krokiEndpoint: 'https://custom-kroki.example.com',
      debounceDelay: 500,
      cacheSize: 100,
    };
    const errors = validateConfig(config);
    expect(errors).toHaveLength(0);
  });
});
