/**
 * Configuration validation utilities
 * Separated from config.ts to allow testing without VSCode API
 */

import type { DiagramPreviewerConfig } from './types';

/**
 * Validates configuration values and returns any validation errors
 * 
 * @param config - Configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateConfig(config: DiagramPreviewerConfig): string[] {
  const errors: string[] = [];

  // Validate debounce delay
  if (config.debounceDelay < 0) {
    errors.push('debounceDelay must be non-negative');
  }
  if (config.debounceDelay > 5000) {
    errors.push('debounceDelay should not exceed 5000ms for good UX');
  }

  // Validate cache size
  if (config.cacheSize < 1) {
    errors.push('cacheSize must be at least 1');
  }
  if (config.cacheSize > 1000) {
    errors.push('cacheSize should not exceed 1000 to avoid memory issues');
  }

  // Validate Kroki endpoint
  if (!config.krokiEndpoint || config.krokiEndpoint.trim() === '') {
    errors.push('krokiEndpoint cannot be empty');
  }
  try {
    new URL(config.krokiEndpoint);
  } catch {
    errors.push('krokiEndpoint must be a valid URL');
  }

  // Validate Kroki rate limit
  if (config.krokiRateLimit < 0) {
    errors.push('krokiRateLimit must be non-negative');
  }

  // Validate Kroki auth if present
  if (config.krokiAuth) {
    if (!['basic', 'bearer'].includes(config.krokiAuth.type)) {
      errors.push('krokiAuth.type must be "basic" or "bearer"');
    }
    if (!config.krokiAuth.credentials || config.krokiAuth.credentials.trim() === '') {
      errors.push('krokiAuth.credentials cannot be empty when krokiAuth is set');
    }
  }

  // Validate mermaid themes
  if (!config.mermaidTheme.light || config.mermaidTheme.light.trim() === '') {
    errors.push('mermaidTheme.light cannot be empty');
  }
  if (!config.mermaidTheme.dark || config.mermaidTheme.dark.trim() === '') {
    errors.push('mermaidTheme.dark cannot be empty');
  }

  return errors;
}
