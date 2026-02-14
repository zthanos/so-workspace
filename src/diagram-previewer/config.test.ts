/**
 * Unit tests for configuration validation
 * Note: readConfig() is not tested here as it requires VSCode API
 */

import { validateConfig } from './config-validator';
import { DEFAULT_CONFIG } from './types';
import type { DiagramPreviewerConfig } from './types';

describe('Configuration Validation', () => {
  test('should validate default configuration without errors', () => {
    const errors = validateConfig(DEFAULT_CONFIG);
    expect(errors).toHaveLength(0);
  });

  test('should reject negative debounce delay', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      debounceDelay: -100,
    };
    const errors = validateConfig(config);
    expect(errors).toContain('debounceDelay must be non-negative');
  });

  test('should warn about excessive debounce delay', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      debounceDelay: 10000,
    };
    const errors = validateConfig(config);
    expect(errors).toContain('debounceDelay should not exceed 5000ms for good UX');
  });

  test('should reject cache size less than 1', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      cacheSize: 0,
    };
    const errors = validateConfig(config);
    expect(errors).toContain('cacheSize must be at least 1');
  });

  test('should warn about excessive cache size', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      cacheSize: 2000,
    };
    const errors = validateConfig(config);
    expect(errors).toContain('cacheSize should not exceed 1000 to avoid memory issues');
  });

  test('should reject empty Kroki endpoint', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      krokiEndpoint: '',
    };
    const errors = validateConfig(config);
    expect(errors).toContain('krokiEndpoint cannot be empty');
  });

  test('should reject invalid Kroki endpoint URL', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      krokiEndpoint: 'not-a-valid-url',
    };
    const errors = validateConfig(config);
    expect(errors).toContain('krokiEndpoint must be a valid URL');
  });

  test('should accept valid Kroki endpoint URL', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      krokiEndpoint: 'https://custom-kroki.example.com',
    };
    const errors = validateConfig(config);
    expect(errors).toHaveLength(0);
  });

  test('should reject negative Kroki rate limit', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      krokiRateLimit: -500,
    };
    const errors = validateConfig(config);
    expect(errors).toContain('krokiRateLimit must be non-negative');
  });

  test('should reject invalid Kroki auth type', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      krokiAuth: {
        type: 'invalid' as any,
        credentials: 'test',
      },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('krokiAuth.type must be "basic" or "bearer"');
  });

  test('should reject empty Kroki auth credentials', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      krokiAuth: {
        type: 'basic',
        credentials: '',
      },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('krokiAuth.credentials cannot be empty when krokiAuth is set');
  });

  test('should accept valid Kroki auth', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      krokiAuth: {
        type: 'bearer',
        credentials: 'my-token-123',
      },
    };
    const errors = validateConfig(config);
    expect(errors).toHaveLength(0);
  });

  test('should reject empty mermaid light theme', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      mermaidTheme: {
        light: '',
        dark: 'dark',
      },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('mermaidTheme.light cannot be empty');
  });

  test('should reject empty mermaid dark theme', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      mermaidTheme: {
        light: 'default',
        dark: '',
      },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('mermaidTheme.dark cannot be empty');
  });

  test('should accept custom mermaid themes', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      mermaidTheme: {
        light: 'forest',
        dark: 'neutral',
      },
    };
    const errors = validateConfig(config);
    expect(errors).toHaveLength(0);
  });

  test('should accumulate multiple validation errors', () => {
    const config: DiagramPreviewerConfig = {
      ...DEFAULT_CONFIG,
      debounceDelay: -100,
      cacheSize: 0,
      krokiEndpoint: '',
    };
    const errors = validateConfig(config);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
