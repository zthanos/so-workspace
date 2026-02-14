/**
 * Configuration reader utility for Diagram Previewer
 * Reads and validates configuration from VSCode workspace settings
 */

import * as vscode from 'vscode';
import { DiagramPreviewerConfig, DEFAULT_CONFIG } from './types';
import { validateConfig } from './config-validator';

// Re-export for convenience
export { validateConfig };

/**
 * Configuration section name in VSCode settings
 */
const CONFIG_SECTION = 'diagramPreviewer';

/**
 * Reads the diagram previewer configuration from VSCode workspace settings
 * Merges user settings with default values
 * 
 * @returns Complete configuration object with defaults applied
 */
export function readConfig(): DiagramPreviewerConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return {
    autoOpenPreview: config.get<boolean>('autoOpenPreview', DEFAULT_CONFIG.autoOpenPreview),
    debounceDelay: config.get<number>('debounceDelay', DEFAULT_CONFIG.debounceDelay),
    cacheSize: config.get<number>('cacheSize', DEFAULT_CONFIG.cacheSize),
    krokiEndpoint: config.get<string>('krokiEndpoint', DEFAULT_CONFIG.krokiEndpoint),
    krokiRateLimit: config.get<number>('krokiRateLimit', DEFAULT_CONFIG.krokiRateLimit),
    krokiAuth: config.get<{ type: 'basic' | 'bearer'; credentials: string }>('krokiAuth'),
    mermaidTheme: {
      light: config.get<string>('mermaidTheme.light', DEFAULT_CONFIG.mermaidTheme.light),
      dark: config.get<string>('mermaidTheme.dark', DEFAULT_CONFIG.mermaidTheme.dark),
    },
  };
}

/**
 * Listens for configuration changes and invokes callback
 * 
 * @param callback - Function to call when configuration changes
 * @returns Disposable to stop listening
 */
export function onConfigChange(callback: (config: DiagramPreviewerConfig) => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(CONFIG_SECTION)) {
      const newConfig = readConfig();
      callback(newConfig);
    }
  });
}
