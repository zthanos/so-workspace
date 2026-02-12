/**
 * Configuration Loader
 * 
 * Responsible for reading and parsing workspace configuration files.
 * Handles file system operations, JSON parsing, and schema validation.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5, 2.5, 6.2, 6.3
 */

import * as vscode from "vscode";
import { WorkspaceConfig, EndpointConfigurations } from "./config-types";
import { readText, exists } from "./fsutil";

/**
 * Configuration file path relative to workspace root
 */
const CONFIG_FILE_PATH = ".vscode/so-workspace.config.json";

/**
 * Loads and validates workspace configuration files
 */
export class ConfigLoader {
  /**
   * Load workspace configuration from file
   * 
   * Returns null if file doesn't exist or is invalid.
   * Logs errors and displays user-friendly messages for invalid configurations.
   * 
   * @returns WorkspaceConfig object if valid, null otherwise
   * 
   * Requirements:
   * - 1.1: Check for configuration file at .vscode/so-workspace.config.json
   * - 1.2: Parse file as valid JSON
   * - 1.4: Fall back to VS Code settings if file doesn't exist
   * - 1.5: Log error and fall back if file is invalid JSON
   */
  async loadWorkspaceConfig(): Promise<WorkspaceConfig | null> {
    try {
      // Check if configuration file exists (Requirement 1.1)
      const fileExists = await exists(CONFIG_FILE_PATH);
      
      if (!fileExists) {
        // File doesn't exist - this is expected, use defaults (Requirement 1.4)
        console.log(`No workspace config found at ${CONFIG_FILE_PATH}, using defaults`);
        return null;
      }

      // Read and parse JSON (Requirement 1.2)
      const content = await readText(CONFIG_FILE_PATH);
      const config = JSON.parse(content) as WorkspaceConfig;

      // Validate schema (Requirement 2.5)
      this.validateConfig(config);

      console.log("Workspace configuration loaded successfully");
      return config;

    } catch (error) {
      // Handle errors and fall back to VS Code settings (Requirement 1.5)
      return this.handleLoadError(error);
    }
  }

  /**
   * Handle configuration loading errors
   * 
   * Displays user-friendly error messages and returns null to trigger fallback.
   * 
   * @param error - The error that occurred during loading
   * @returns null to trigger fallback to VS Code settings
   * 
   * Requirements:
   * - 1.5: Log error and fall back to VS Code settings
   * - 6.1: Display parse error location for invalid JSON
   * - 6.4: Log detailed diagnostic information
   */
  private handleLoadError(error: unknown): null {
    console.error("Failed to load workspace config:", error);

    if (error instanceof SyntaxError) {
      // JSON parse error (Requirement 6.1)
      vscode.window.showErrorMessage(
        `Invalid JSON in ${CONFIG_FILE_PATH}: ${error.message}. Using VS Code settings instead.`
      );
    } else if (error instanceof ConfigValidationError) {
      // Schema validation error (Requirement 6.2, 6.3)
      vscode.window.showErrorMessage(
        `Configuration validation failed: ${error.message}. Using VS Code settings instead.`
      );
    } else if (error && typeof error === "object" && "code" in error) {
      // File system error
      const fsError = error as { code: string; message: string };
      
      if (fsError.code === "EACCES") {
        vscode.window.showErrorMessage(
          `Permission denied reading ${CONFIG_FILE_PATH}. Check file permissions.`
        );
      } else {
        vscode.window.showErrorMessage(
          `Failed to load workspace config: ${fsError.message}`
        );
      }
    } else {
      // Unknown error
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to load workspace config: ${errorMessage}`
      );
    }

    return null;
  }

  /**
   * Validate configuration schema
   * 
   * Throws ConfigValidationError if validation fails with descriptive error messages.
   * 
   * @param config - Configuration object to validate
   * @throws ConfigValidationError if validation fails
   * 
   * Requirements:
   * - 2.5: Validate required fields and data types
   * - 6.2: List missing fields in error message
   * - 6.3: Specify expected type for incorrect types
   */
  private validateConfig(config: WorkspaceConfig): void {
    // Validate version field if present
    if (config.version !== undefined && typeof config.version !== "string") {
      throw new ConfigValidationError(
        "version",
        "string",
        typeof config.version
      );
    }

    // Validate activeEnvironment field if present
    if (config.activeEnvironment !== undefined && typeof config.activeEnvironment !== "string") {
      throw new ConfigValidationError(
        "activeEnvironment",
        "string",
        typeof config.activeEnvironment
      );
    }

    // Validate endpoints section if present
    if (config.endpoints !== undefined) {
      if (typeof config.endpoints !== "object" || config.endpoints === null) {
        throw new ConfigValidationError(
          "endpoints",
          "object",
          typeof config.endpoints
        );
      }
      this.validateEndpoints(config.endpoints);
    }

    // Validate environments section if present
    if (config.environments !== undefined) {
      if (typeof config.environments !== "object" || config.environments === null) {
        throw new ConfigValidationError(
          "environments",
          "object",
          typeof config.environments
        );
      }

      // Validate each environment configuration
      for (const [envName, envConfig] of Object.entries(config.environments)) {
        if (typeof envConfig !== "object" || envConfig === null) {
          throw new ConfigValidationError(
            `environments.${envName}`,
            "object",
            typeof envConfig
          );
        }
        this.validateEndpoints(envConfig);
      }
    }
  }

  /**
   * Validate endpoint configurations
   * 
   * @param endpoints - Endpoint configurations to validate
   * @throws ConfigValidationError if validation fails
   * 
   * Requirements:
   * - 2.3: Validate PlantUML endpoint properties
   * - 2.4: Validate Java backend properties
   * - 6.3: Specify expected type for incorrect types
   */
  private validateEndpoints(endpoints: EndpointConfigurations): void {
    // Validate PlantUML config (Requirement 2.3)
    if (endpoints.plantuml !== undefined) {
      const plantuml = endpoints.plantuml;
      
      if (typeof plantuml !== "object" || plantuml === null) {
        throw new ConfigValidationError("endpoints.plantuml", "object", typeof plantuml);
      }

      // url is required
      if (plantuml.url === undefined) {
        throw new ConfigValidationError("endpoints.plantuml.url", "string (required)", "undefined");
      }
      if (typeof plantuml.url !== "string") {
        throw new ConfigValidationError("endpoints.plantuml.url", "string", typeof plantuml.url);
      }

      // Optional fields
      if (plantuml.timeout !== undefined && typeof plantuml.timeout !== "number") {
        throw new ConfigValidationError("endpoints.plantuml.timeout", "number", typeof plantuml.timeout);
      }
      if (plantuml.enabled !== undefined && typeof plantuml.enabled !== "boolean") {
        throw new ConfigValidationError("endpoints.plantuml.enabled", "boolean", typeof plantuml.enabled);
      }
    }

    // Validate Java backend config (Requirement 2.4)
    if (endpoints.java !== undefined) {
      const java = endpoints.java;
      
      if (typeof java !== "object" || java === null) {
        throw new ConfigValidationError("endpoints.java", "object", typeof java);
      }

      // All fields are optional
      if (java.plantUmlJarPath !== undefined && typeof java.plantUmlJarPath !== "string") {
        throw new ConfigValidationError("endpoints.java.plantUmlJarPath", "string", typeof java.plantUmlJarPath);
      }
      if (java.mermaidCliPath !== undefined && typeof java.mermaidCliPath !== "string") {
        throw new ConfigValidationError("endpoints.java.mermaidCliPath", "string", typeof java.mermaidCliPath);
      }
      if (java.javaPath !== undefined && typeof java.javaPath !== "string") {
        throw new ConfigValidationError("endpoints.java.javaPath", "string", typeof java.javaPath);
      }
      if (java.enabled !== undefined && typeof java.enabled !== "boolean") {
        throw new ConfigValidationError("endpoints.java.enabled", "boolean", typeof java.enabled);
      }
    }

    // Validate rendering config
    if (endpoints.rendering !== undefined) {
      const rendering = endpoints.rendering;
      
      if (typeof rendering !== "object" || rendering === null) {
        throw new ConfigValidationError("endpoints.rendering", "object", typeof rendering);
      }

      // All fields are optional
      if (rendering.sourceDirectory !== undefined && typeof rendering.sourceDirectory !== "string") {
        throw new ConfigValidationError("endpoints.rendering.sourceDirectory", "string", typeof rendering.sourceDirectory);
      }
      if (rendering.outputDirectory !== undefined && typeof rendering.outputDirectory !== "string") {
        throw new ConfigValidationError("endpoints.rendering.outputDirectory", "string", typeof rendering.outputDirectory);
      }
      if (rendering.concurrencyLimit !== undefined && typeof rendering.concurrencyLimit !== "number") {
        throw new ConfigValidationError("endpoints.rendering.concurrencyLimit", "number", typeof rendering.concurrencyLimit);
      }
    }
  }
}

/**
 * Custom error class for configuration validation failures
 * 
 * Provides detailed error messages with field name, expected type, and actual type.
 * 
 * Requirements:
 * - 6.2: List missing fields in error message
 * - 6.3: Specify expected type for incorrect types
 */
export class ConfigValidationError extends Error {
  constructor(
    public readonly fieldName: string,
    public readonly expectedType: string,
    public readonly actualType: string
  ) {
    super(
      `Configuration field "${fieldName}" has incorrect type. Expected ${expectedType}, got ${actualType}.`
    );
    this.name = "ConfigValidationError";
  }
}
