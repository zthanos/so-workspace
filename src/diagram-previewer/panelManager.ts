/**
 * PanelManager - Manages webview panel lifecycle and content routing
 * 
 * Singleton class that creates, updates, and manages the diagram preview webview panel.
 * Handles renderer routing, debounced updates, and active editor tracking.
 * 
 * Requirements: 1.2, 1.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { IRenderer, RenderOptions, EXTENSION_MAP, ExtensionMapping } from './types';
import { RenderCache } from './renderCache';
import { MermaidRenderer } from './renderers/mermaidRenderer';
import { KrokiRenderer } from './renderers/krokiRenderer';
import { readConfig } from './config';
import { ThemeManager } from './themeManager';
import { getLogger } from './logger';

const outputChannel = vscode.window.createOutputChannel('panelManager Renderer Debug');

/**
 * PanelManager singleton class
 * Manages the lifecycle of the diagram preview webview panel
 */
export class PanelManager {
  private static instance: PanelManager | undefined;
  private panel: vscode.WebviewPanel | undefined;
  private currentEditor: vscode.TextEditor | undefined;
  private updateTimeout: NodeJS.Timeout | undefined;
  private context: vscode.ExtensionContext;
  private cache: RenderCache;
  private mermaidRenderer: MermaidRenderer | undefined;
  private krokiRenderer: KrokiRenderer | undefined;
  private themeManager: ThemeManager;
  private editorChangeDisposable: vscode.Disposable | undefined;
  private disposables: vscode.Disposable[] = [];

  /**
   * Private constructor for singleton pattern
   * @param context - VSCode extension context
   */
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // Initialize cache with configured size
    const config = readConfig();
    this.cache = new RenderCache(config.cacheSize);

    // Initialize theme manager
    this.themeManager = new ThemeManager();
  }

  /**
   * Get or create the singleton instance
   * @param context - VSCode extension context
   * @returns PanelManager instance
   */
  static getInstance(context: vscode.ExtensionContext): PanelManager {
    if (!PanelManager.instance) {
      PanelManager.instance = new PanelManager(context);
    }
    return PanelManager.instance;
  }

  /**
   * Open or reveal the diagram preview panel
   * @param editor - Text editor containing diagram source
   */
  openPreview(editor: vscode.TextEditor): void {
    const logger = getLogger();
    const fileExtension = path.extname(editor.document.fileName);

    console.log('[PanelManager] ========== OPENING PREVIEW ==========');
    console.log('[PanelManager] File:', editor.document.fileName);
    console.log('[PanelManager] Extension:', fileExtension);

    logger?.info('Opening diagram preview', {
      fileName: editor.document.fileName,
      extension: fileExtension
    });

    if (!this.panel) {
      console.log('[PanelManager] Creating new panel');
      this.panel = this.createPanel();
      this.setupActiveEditorTracking();
    } else {
      console.log('[PanelManager] Revealing existing panel');
      // Reveal existing panel
      this.panel.reveal(vscode.ViewColumn.Beside);
    }

    this.currentEditor = editor;
    this.updatePreview(editor);
  }

  /**
   * Update the preview with debounced updates
   * @param editor - Text editor containing diagram source
   */
  updatePreview(editor: vscode.TextEditor): void {
    // Clear existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Schedule update after debounce delay
    this.scheduleUpdate(editor);
  }

  /**
   * Handle configuration changes
   * Updates cache size, recreates renderers with new settings
   */
  handleConfigChange(): void {
    const config = readConfig();
    const logger = getLogger();

    logger?.info('Configuration changed, applying new settings', {
      debounceDelay: config.debounceDelay,
      cacheSize: config.cacheSize,
      krokiEndpoint: config.krokiEndpoint,
      krokiRateLimit: config.krokiRateLimit,
    });

    // Update cache size
    this.cache = new RenderCache(config.cacheSize);

    // Recreate Kroki renderer with new settings
    if (this.krokiRenderer) {
      this.krokiRenderer.dispose();
      this.krokiRenderer = new KrokiRenderer(this.cache, {
        endpoint: config.krokiEndpoint,
        rateLimit: config.krokiRateLimit,
        auth: config.krokiAuth,
      });
    }

    // Trigger re-render if there's an active editor
    if (this.currentEditor && this.panel) {
      this.updatePreview(this.currentEditor);
    }
  }

  /**
   * Dispose the panel manager and clean up resources
   */
  dispose(): void {
    // Clear update timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = undefined;
    }

    // Dispose panel
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }

    // Dispose renderers
    if (this.mermaidRenderer) {
      this.mermaidRenderer.dispose();
      this.mermaidRenderer = undefined;
    }

    if (this.krokiRenderer) {
      this.krokiRenderer.dispose();
      this.krokiRenderer = undefined;
    }

    // Dispose editor change listener
    if (this.editorChangeDisposable) {
      this.editorChangeDisposable.dispose();
      this.editorChangeDisposable = undefined;
    }

    // Dispose all other disposables
    this.disposables.forEach(d => {
      if (d && typeof d.dispose === 'function') {
        d.dispose();
      }
    });
    this.disposables = [];

    // Clear cache
    this.cache.clear();

    // Clear singleton instance
    PanelManager.instance = undefined;
  }

  /**
   * Create a new webview panel
   * @returns Created webview panel
   * @private
   */
  private createPanel(): vscode.WebviewPanel {
    console.log('[PanelManager] Creating webview panel...');

    const panel = vscode.window.createWebviewPanel(
      'diagramPreview',
      'Diagram Preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'dist')),
          vscode.Uri.file(path.join(this.context.extensionPath, 'assets')),
        ],
        retainContextWhenHidden: true,
        // Enable developer tools for webview debugging
        enableFindWidget: true,
        enableCommandUris: true,
      }
    );

    console.log('[PanelManager] Webview panel created');
    console.log('[PanelManager] Setting HTML content...');

    // Set initial HTML content
    panel.webview.html = this.getWebviewContent(panel.webview);

    console.log('[PanelManager] HTML content set');

    // Handle panel disposal
    panel.onDidDispose(() => {
      console.log('[PanelManager] Panel disposed');
      this.panel = undefined;
      this.currentEditor = undefined;

      // Dispose renderers when panel is closed
      if (this.mermaidRenderer) {
        this.mermaidRenderer.dispose();
        this.mermaidRenderer = undefined;
      }

      if (this.krokiRenderer) {
        this.krokiRenderer.dispose();
        this.krokiRenderer = undefined;
      }
    }, null, this.disposables);

    console.log('[PanelManager] Panel setup complete');
    return panel;
  }

  /**
   * Get the renderer for a given file extension
   * @param fileExtension - File extension (e.g., '.mmd', '.puml')
   * @returns Renderer instance or undefined if not supported
   * @private
   */
  private async getRenderer(fileExtension: string): Promise<{ renderer: IRenderer; mapping: ExtensionMapping } | undefined> {
    const logger = getLogger();
    const normalizedExtension = fileExtension.toLowerCase();

    console.log('[PanelManager] ========== GETTING RENDERER ==========');
    console.log('[PanelManager] Original extension:', fileExtension);
    console.log('[PanelManager] Normalized extension:', normalizedExtension);

    logger?.debug('Getting renderer for file extension', {
      originalExtension: fileExtension,
      normalizedExtension
    });

    const mapping = EXTENSION_MAP[normalizedExtension];

    if (!mapping) {
      console.log('[PanelManager] ❌ Extension NOT found in EXTENSION_MAP');
      logger?.warning('File extension not found in EXTENSION_MAP, attempting content-based detection', {
        extension: normalizedExtension
      });

      // Try content-based detection
      const detectedMapping = await this.detectFromContent();
      if (detectedMapping) {
        console.log('[PanelManager] ✅ Detected from content:', detectedMapping);
        logger?.info('Detected diagram type from content', {
          renderer: detectedMapping.renderer,
          diagramType: detectedMapping.diagramType
        });
        const renderer = this.createRenderer(detectedMapping);
        return renderer ? { renderer, mapping: detectedMapping } : undefined;
      }

      // Prompt user for manual selection
      console.log('[PanelManager] Content detection failed, prompting user');
      logger?.info('Content-based detection failed, prompting user for manual selection');
      const selection = await this.promptForRenderer();
      if (selection) {
        console.log('[PanelManager] ✅ User selected:', selection);
        logger?.info('User selected diagram type', {
          renderer: selection.renderer,
          diagramType: selection.diagramType
        });
        const renderer = this.createRenderer(selection);
        return renderer ? { renderer, mapping: selection } : undefined;
      }

      console.log('[PanelManager] ❌ Unable to determine diagram type');
      logger?.error('Unable to determine diagram type - no mapping, detection, or user selection');
      return undefined;
    }

    console.log('[PanelManager] ✅ Found mapping in EXTENSION_MAP:', mapping);
    logger?.debug('Found mapping in EXTENSION_MAP', {
      renderer: mapping.renderer,
      diagramType: mapping.diagramType
    });

    console.log('[PanelManager] About to call createRenderer...');
    const renderer = this.createRenderer(mapping);
    console.log('[PanelManager] ✅ createRenderer returned successfully');
    return renderer ? { renderer, mapping } : undefined;
  }

  /**
   * Create a renderer instance based on mapping
   * @param mapping - Extension mapping configuration
   * @returns Renderer instance
   * @private
   */
  private createRenderer(mapping: ExtensionMapping): IRenderer {
    const logger = getLogger();

    console.log('[PanelManager] ========== CREATING RENDERER ==========');
    console.log('[PanelManager] Mapping:', mapping);
    console.log('[PanelManager] Renderer type:', mapping.renderer);
    console.log('[PanelManager] Diagram type:', mapping.diagramType || 'N/A');

    if (mapping.renderer === 'mermaid') {
      console.log('[PanelManager] 🎨 Using MERMAID renderer');
      logger?.debug('Creating/reusing Mermaid renderer');
      if (!this.mermaidRenderer && this.panel) {
        this.mermaidRenderer = new MermaidRenderer(this.panel.webview, this.cache);
        this.mermaidRenderer.registerThemeManager(this.themeManager);
        logger?.info('Mermaid renderer created');
      }
      console.log('[PanelManager] Returning Mermaid renderer instance');
      return this.mermaidRenderer!;
    } else {
      console.log('[PanelManager] 🌐 Using KROKI renderer');
      logger?.debug('Creating/reusing Kroki renderer', { diagramType: mapping.diagramType });
      if (!this.krokiRenderer) {
        console.log('[PanelManager] Creating new Kroki renderer instance...');
        const config = readConfig();
        console.log('[PanelManager] 📋 Config loaded:', {
          krokiEndpoint: config.krokiEndpoint,
          krokiRateLimit: config.krokiRateLimit
        });
        this.krokiRenderer = new KrokiRenderer(this.cache, {
          endpoint: config.krokiEndpoint,
          rateLimit: config.krokiRateLimit,
          auth: config.krokiAuth,
        });
        console.log('[PanelManager] Kroki renderer instance created');
        logger?.info('Kroki renderer created', {
          endpoint: config.krokiEndpoint,
          rateLimit: config.krokiRateLimit
        });
      } else {
        console.log('[PanelManager] Reusing existing Kroki renderer instance');
        console.log('[PanelManager] ⚠️ Existing renderer endpoint:', this.krokiRenderer['apiEndpoint']);
      }
      console.log('[PanelManager] Returning Kroki renderer instance');
      return this.krokiRenderer!;
    }
  }

  /**
   * Detect diagram type from file content
   * @returns Extension mapping or undefined
   * @private
   */
  private async detectFromContent(): Promise<ExtensionMapping | undefined> {
    if (!this.currentEditor) {
      return undefined;
    }

    const content = this.currentEditor.document.getText();
    const trimmedContent = content.trim();

    // Check for PlantUML syntax patterns (check first as it's most specific)
    if (trimmedContent.startsWith('@startuml') ||
      trimmedContent.startsWith('@startmindmap') ||
      trimmedContent.startsWith('@startsalt') ||
      trimmedContent.startsWith('@startgantt')) {
      return { renderer: 'kroki', diagramType: 'plantuml' };
    }

    // Check for Structurizr DSL patterns
    if (trimmedContent.startsWith('workspace')) {
      return { renderer: 'kroki', diagramType: 'structurizr' };
    }

    // Check for GraphViz syntax patterns (must check before Mermaid 'graph')
    // GraphViz uses 'digraph' or 'graph {' with curly braces
    if (trimmedContent.startsWith('digraph') ||
      (trimmedContent.startsWith('graph') && trimmedContent.includes('{'))) {
      return { renderer: 'kroki', diagramType: 'graphviz' };
    }

    // Check for Mermaid syntax patterns
    // Mermaid uses 'graph TB', 'graph LR', etc. (with direction keywords)
    const mermaidGraphPattern = /^graph\s+(TB|BT|RL|LR|TD)/;
    if (
      mermaidGraphPattern.test(trimmedContent) ||
      trimmedContent.startsWith('sequenceDiagram') ||
      trimmedContent.startsWith('classDiagram') ||
      trimmedContent.startsWith('stateDiagram') ||
      trimmedContent.startsWith('erDiagram') ||
      trimmedContent.startsWith('gantt') ||
      trimmedContent.startsWith('pie') ||
      trimmedContent.startsWith('flowchart') ||
      trimmedContent.startsWith('journey') ||
      trimmedContent.startsWith('gitGraph') ||
      trimmedContent.startsWith('mindmap') ||
      trimmedContent.startsWith('timeline') ||
      trimmedContent.startsWith('quadrantChart') ||
      trimmedContent.startsWith('requirementDiagram') ||
      trimmedContent.startsWith('C4Context') ||
      trimmedContent.startsWith('C4Container') ||
      trimmedContent.startsWith('C4Component') ||
      trimmedContent.startsWith('C4Dynamic') ||
      trimmedContent.startsWith('C4Deployment')
    ) {
      return { renderer: 'mermaid' };
    }

    return undefined;
  }

  /**
   * Prompt user to manually select renderer
   * @returns Extension mapping or undefined
   * @private
   */
  private async promptForRenderer(): Promise<ExtensionMapping | undefined> {

    const selection = await vscode.window.showQuickPick(
      [
        { label: 'Mermaid', value: { renderer: 'mermaid' as const } },
        { label: 'PlantUML (Kroki)', value: { renderer: 'kroki' as const, diagramType: 'plantuml' } },
        { label: 'GraphViz (Kroki)', value: { renderer: 'kroki' as const, diagramType: 'graphviz' } },
        { label: 'Structurizr (Kroki)', value: { renderer: 'kroki' as const, diagramType: 'structurizr' } },
      ],
      {
        placeHolder: 'Select diagram type',
        title: 'Unable to detect diagram type automatically',
      }
    );

    return selection?.value;
  }

  /**
   * Schedule a debounced update
   * @param editor - Text editor to update from
   * @private
   */
  private scheduleUpdate(editor: vscode.TextEditor): void {
    const config = readConfig();

    this.updateTimeout = setTimeout(async () => {
      await this.performUpdate(editor);
    }, config.debounceDelay);
  }

  /**
   * Perform the actual update
   * @param editor - Text editor to update from
   * @private
   */
  private async performUpdate(editor: vscode.TextEditor): Promise<void> {
    if (!this.panel) {
      return;
    }

    const logger = getLogger();

    try {
      // Show loading indicator
      this.showLoading(true);

      // Get file extension
      const fileExtension = path.extname(editor.document.fileName);

      console.log('[PanelManager] ========== PERFORM UPDATE ==========');
      console.log('[PanelManager] File:', editor.document.fileName);
      console.log('[PanelManager] Extension:', fileExtension);

      // Get appropriate renderer and mapping
      const result = await this.getRenderer(fileExtension);
      if (!result) {
        console.log('[PanelManager] ❌ No renderer available');
        this.showLoading(false);
        this.showError('Unsupported diagram type');
        logger?.warning('Unsupported diagram type', {
          fileName: editor.document.fileName,
          extension: fileExtension
        });
        return;
      }

      const { renderer, mapping } = result;
      console.log('[PanelManager] ✅ Renderer obtained, starting render');
      console.log('[PanelManager] Mapping:', mapping);
      console.log('[PanelManager] Diagram type:', mapping.diagramType);

      // Get content and generate cache key
      const content = editor.document.getText();
      const cacheKey = RenderCache.generateKey(editor.document.fileName, content);

      // Get current theme
      const theme = this.themeManager.getCurrentTheme();

      logger?.debug('Rendering diagram', {
        fileName: editor.document.fileName,
        extension: fileExtension,
        theme,
        contentLength: content.length,
        diagramType: mapping.diagramType
      });

      // Render diagram with diagram type
      console.log('[PanelManager] Calling renderer.render() with diagramType:', mapping.diagramType);
      const renderResult = await renderer.render(content, {
        theme,
        cacheKey,
        diagramType: mapping.diagramType
      });
      console.log('[PanelManager] Render complete. Result type:', renderResult.type);

      // Hide loading indicator
      this.showLoading(false);

      // Update webview
      if (renderResult.type === 'error') {
        const error = '[PanelManager] ❌ Render error:' + (renderResult.error || "NULL Value");
        outputChannel.appendLine(error);
        console.log('[PanelManager] ❌ Render error:', renderResult.error);
        this.showError(renderResult.error || 'Unknown rendering error');
      } else {
        const sendingType = `[PanelManager] ✅ Sending to webview. Type: ${renderResult.type}, Length: ${renderResult.content.length}`;
        outputChannel.appendLine(sendingType)

        const contentPreview = `[PanelManager] Content preview: ${renderResult.content.substring(0, 100)}`
        outputChannel.appendLine(contentPreview)
        console.log('[PanelManager] ✅ Sending to webview. Type:', renderResult.type, 'Length:', renderResult.content.length);
        console.log('[PanelManager] Content preview:', renderResult.content.substring(0, 100));
        this.showDiagram(renderResult.content, renderResult.type);
      }
    } catch (error) {
      console.log('[PanelManager] ❌ Exception during render:', error);
      this.showLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.showError(`Rendering failed: ${errorMessage}`);
      logger?.renderError(editor.document.fileName, error);
    }
  }

  /**
   * Setup active editor tracking
   * @private
   */
  private setupActiveEditorTracking(): void {
    // Dispose existing listener if any
    if (this.editorChangeDisposable) {
      this.editorChangeDisposable.dispose();
    }

    // Listen for active editor changes
    this.editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && this.panel && this.isSupportedFile(editor.document.fileName)) {
        this.currentEditor = editor;
        this.updatePreview(editor);
      }
    });

    this.disposables.push(this.editorChangeDisposable);
  }

  /**
   * Check if a file is supported for diagram preview
   * @param fileName - File name to check
   * @returns True if supported
   * @private
   */
  private isSupportedFile(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase();
    return extension in EXTENSION_MAP;
  }

  /**
   * Show diagram in webview
   * @param content - Diagram content (SVG or PNG data URL)
   * @param type - Content type ('svg' or 'png')
   * @private
   */
  private showDiagram(content: string, type: 'svg' | 'png'): void {
    if (!this.panel) {
      vscode.window.showErrorMessage('Diagram Previewer: Panel is not initialized');
      return;
    }

    const logger = getLogger();

    console.log('[PanelManager] ========== SENDING TO WEBVIEW ==========');
    console.log('[PanelManager] Format:', type);
    console.log('[PanelManager] Content length:', content.length);
    console.log('[PanelManager] Content preview (first 200 chars):', content.substring(0, 200));
    console.log('[PanelManager] Starts with <?xml:', content.trim().startsWith('<?xml'));
    console.log('[PanelManager] Starts with <svg:', content.trim().startsWith('<svg'));
    console.log('[PanelManager] Contains <svg:', content.includes('<svg'));

    logger?.debug('Sending diagram to webview', {
      type,
      contentLength: content.length,
      contentPreview: content.substring(0, 200)
    });

    this.panel.webview.postMessage({
      type: 'update',
      content,
      format: type,
    });

    console.log('[PanelManager] ✅ Message posted to webview');
  }

  /**
   * Show error in webview
   * @param message - Error message
   * @private
   */
  private showError(message: string): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.postMessage({
      type: 'error',
      message,
    });
  }

  /**
   * Show or hide loading indicator in webview
   * @param isLoading - Whether to show loading indicator
   * @private
   */
  private showLoading(isLoading: boolean): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.postMessage({
      type: 'loading',
      isLoading,
    });
  }

  /**
   * Get webview HTML content
   * @param webview - Webview instance
   * @returns HTML content string
   * @private
   */
  private getWebviewContent(webview: vscode.Webview): string {
    // Generate nonce for CSP
    const nonce = this.getNonce();

    // Get URIs for resources
    const mermaidUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'mermaid', 'mermaid.esm.min.mjs'))
    );

    const mainJsUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview-main.js'))
    );

    // Read the HTML template
    const htmlPath = path.join(this.context.extensionPath, 'dist', 'webview-index.html');
    const logger = getLogger();

    try {
      const fs = require('fs');
      if (!fs.existsSync(htmlPath)) {
        logger?.warning('HTML template not found, using fallback', { htmlPath });
        return this.getInlineWebviewContent(webview, nonce, mermaidUri, mainJsUri);
      }

      let html = fs.readFileSync(htmlPath, 'utf-8');

      // Replace placeholders
      html = html.replace(/\{\{nonce\}\}/g, nonce);
      html = html.replace(/\{\{mermaidUri\}\}/g, mermaidUri.toString());
      html = html.replace(/\{\{mainJs\}\}/g, mainJsUri.toString());
      html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);

      logger?.debug('Loaded HTML template successfully', { htmlPath });
      return html;
    } catch (error) {
      // Fallback to inline HTML if template file not found
      logger?.error('Failed to load HTML template, using fallback', error);
      return this.getInlineWebviewContent(webview, nonce, mermaidUri, mainJsUri);
    }
  }

  /**
   * Fallback inline HTML content
   * @private
   */
  private getInlineWebviewContent(
    webview: vscode.Webview,
    nonce: string,
    mermaidUri: vscode.Uri,
    mainJsUri: vscode.Uri
  ): string {

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https://kroki.io https: data:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
  <title>Diagram Preview</title>
  <script type="module" nonce="${nonce}">
    import mermaid from '${mermaidUri}';
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    window.mermaid = mermaid;
  </script>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
    }
    #container {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    #toolbar {
      padding: 8px;
      background-color: var(--vscode-editorWidget-background);
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    #diagram-container {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #diagram-content {
      max-width: 100%;
      max-height: 100%;
    }
    #error-container {
      flex: 1;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
    }
    #error-message {
      color: var(--vscode-errorForeground);
      white-space: pre-wrap;
      font-family: var(--vscode-editor-font-family);
    }
    .hidden {
      display: none !important;
    }
    button {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 12px;
      cursor: pointer;
      border-radius: 2px;
    }
    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="toolbar">
      <button id="zoom-in" title="Zoom In">+</button>
      <button id="zoom-out" title="Zoom Out">-</button>
      <button id="fit-screen" title="Fit to Screen">Fit</button>
      <button id="export" title="Export">Export</button>
      <input type="text" id="search" placeholder="Search..." style="margin-left: auto; padding: 4px 8px; background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border);">
    </div>
    <div id="diagram-container">
      <div id="diagram-content"></div>
    </div>
    <div id="error-container">
      <div id="error-message"></div>
    </div>
  </div>
  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      const diagramContainer = document.getElementById('diagram-container');
      const diagramContent = document.getElementById('diagram-content');
      const errorContainer = document.getElementById('error-container');
      const errorMessage = document.getElementById('error-message');

      // Handle messages from extension
      window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
          case 'update':
            showDiagram(message.content, message.format);
            break;
          case 'error':
            showError(message.message);
            break;
        }
      });

      function showDiagram(content, format) {
        errorContainer.classList.add('hidden');
        diagramContainer.classList.remove('hidden');

        if (format === 'svg') {
          diagramContent.innerHTML = content;
        } else if (format === 'png') {
          diagramContent.innerHTML = '<img src="' + content + '" alt="Diagram" />';
        }
      }

      function showError(message) {
        diagramContainer.classList.add('hidden');
        errorContainer.classList.remove('hidden');
        errorContainer.style.display = 'flex';
        errorMessage.textContent = message;
      }

      // Toolbar button handlers (placeholder for now)
      document.getElementById('zoom-in').addEventListener('click', () => {
        // TODO: Implement zoom in
      });

      document.getElementById('zoom-out').addEventListener('click', () => {
        // TODO: Implement zoom out
      });

      document.getElementById('fit-screen').addEventListener('click', () => {
        // TODO: Implement fit to screen
      });

      document.getElementById('export').addEventListener('click', () => {
        vscode.postMessage({ type: 'export', format: 'png' });
      });

      document.getElementById('search').addEventListener('input', (e) => {
        // TODO: Implement search
      });
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Generate a random nonce for CSP
   * @returns Random nonce string
   * @private
   */
  private getNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }
}
