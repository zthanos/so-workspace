/**
 * Configuration Merger
 * 
 * Responsible for merging workspace configuration with VS Code settings.
 * Implements precedence logic: environment config > workspace config > VS Code settings > defaults
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import * as vscode from "vscode";
import {
  WorkspaceConfig,
  EndpointConfigurations,
  ResolvedConfig,
  PlantUMLEndpointConfig,
  JavaBackendConfig,
  StructurizrBackendConfig,
  RenderingConfig,
} from "./config-types";

/**
 * Merges workspace configuration with VS Code settings
 * 
 * Applies configuration precedence rules to produce a final resolved configuration.
 * Precedence order: environment config > workspace config > VS Code settings > defaults
 */
export class ConfigMerger {
  /**
   * Merge configurations with precedence rules
   * 
   * Takes workspace configuration and VS Code settings, applies precedence rules,
   * and returns a fully resolved configuration with all fields populated.
   * 
   * @param workspaceConfig - Workspace configuration from .vscode/so-workspace.config.json (may be null)
   * @param vscodeConfig - VS Code workspace configuration
   * @returns Fully resolved configuration with all fields populated
   * 
   * Requirements:
   * - 3.1: Prioritize workspace config over VS Code settings
   * - 3.2: Use VS Code settings when workspace config is undefined
   * - 3.3: Use workspace config when VS Code settings are undefined
   * - 3.4: Use built-in defaults when both are undefined
   * - 3.5: Merge at property level, not object level
   */
  mergeConfigurations(
    workspaceConfig: WorkspaceConfig | null,
    vscodeConfig: vscode.WorkspaceConfiguration
  ): ResolvedConfig {
    // Get active environment config if specified (Requirement 3.1)
    const activeEnv = workspaceConfig?.activeEnvironment || "default";
    const envConfig = workspaceConfig?.environments?.[activeEnv];

    // Merge in order: defaults → VS Code settings → workspace config → environment config
    // This ensures proper precedence (Requirement 3.1, 3.2, 3.3, 3.4, 3.5)
    const resolved: ResolvedConfig = {
      plantuml: this.mergePlantUMLConfig(workspaceConfig, envConfig, vscodeConfig),
      java: this.mergeJavaConfig(workspaceConfig, envConfig, vscodeConfig),
      structurizr: this.mergeStructurizrConfig(workspaceConfig, envConfig, vscodeConfig),
      rendering: this.mergeRenderingConfig(workspaceConfig, envConfig, vscodeConfig),
    };

    return resolved;
  }

  /**
   * Merge PlantUML configuration
   * 
   * Applies precedence rules to PlantUML endpoint configuration.
   * Precedence: environment > workspace > VS Code settings > defaults
   * 
   * @param workspaceConfig - Workspace configuration (may be null)
   * @param envConfig - Environment-specific configuration (may be undefined)
   * @param vscodeConfig - VS Code workspace configuration
   * @returns Fully resolved PlantUML configuration
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  mergePlantUMLConfig(
    workspaceConfig: WorkspaceConfig | null,
    envConfig: EndpointConfigurations | undefined,
    vscodeConfig: vscode.WorkspaceConfiguration
  ): Required<PlantUMLEndpointConfig> {
    // Start with defaults (Requirement 3.4)
    const defaults: Required<PlantUMLEndpointConfig> = {
      url: "https://www.plantuml.com/plantuml",
      timeout: 30000,
      enabled: true,
    };

    // Get VS Code settings (Requirement 3.2)
    const vscodePlantUML = {
      url: vscodeConfig.get<string>("diagrams.plantUmlServerUrl"),
      timeout: vscodeConfig.get<number>("diagrams.plantUmlTimeout"),
    };

    // Get workspace config (Requirement 3.3)
    const workspacePlantUML = workspaceConfig?.endpoints?.plantuml;

    // Get environment config (Requirement 3.1)
    const envPlantUML = envConfig?.plantuml;

    // Merge with precedence: env > workspace > vscode > defaults (Requirement 3.5)
    return {
      url: envPlantUML?.url ?? workspacePlantUML?.url ?? vscodePlantUML.url ?? defaults.url,
      timeout: envPlantUML?.timeout ?? workspacePlantUML?.timeout ?? vscodePlantUML.timeout ?? defaults.timeout,
      enabled: envPlantUML?.enabled ?? workspacePlantUML?.enabled ?? defaults.enabled,
    };
  }

  /**
   * Merge Java backend configuration
   * 
   * Applies precedence rules to Java backend configuration.
   * Precedence: environment > workspace > VS Code settings > defaults
   * 
   * @param workspaceConfig - Workspace configuration (may be null)
   * @param envConfig - Environment-specific configuration (may be undefined)
   * @param vscodeConfig - VS Code workspace configuration
   * @returns Fully resolved Java backend configuration
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  mergeJavaConfig(
    workspaceConfig: WorkspaceConfig | null,
    envConfig: EndpointConfigurations | undefined,
    vscodeConfig: vscode.WorkspaceConfiguration
  ): Required<JavaBackendConfig> {
    // Start with defaults (Requirement 3.4)
    const defaults: Required<JavaBackendConfig> = {
      plantUmlJarPath: "tools/plantuml/plantuml-1.2026.1.jar",
      mermaidCliPath: "mmdc",
      javaPath: "java",
      enabled: true,
    };

    // Get VS Code settings (Requirement 3.2)
    const vscodeJava = {
      plantUmlJarPath: vscodeConfig.get<string>("diagrams.java.plantUmlJarPath"),
      mermaidCliPath: vscodeConfig.get<string>("diagrams.java.mermaidCliPath"),
      javaPath: vscodeConfig.get<string>("diagrams.java.javaPath"),
    };

    // Get workspace config (Requirement 3.3)
    const workspaceJava = workspaceConfig?.endpoints?.java;

    // Get environment config (Requirement 3.1)
    const envJava = envConfig?.java;

    // Merge with precedence: env > workspace > vscode > defaults (Requirement 3.5)
    return {
      plantUmlJarPath: envJava?.plantUmlJarPath ?? workspaceJava?.plantUmlJarPath ?? vscodeJava.plantUmlJarPath ?? defaults.plantUmlJarPath,
      mermaidCliPath: envJava?.mermaidCliPath ?? workspaceJava?.mermaidCliPath ?? vscodeJava.mermaidCliPath ?? defaults.mermaidCliPath,
      javaPath: envJava?.javaPath ?? workspaceJava?.javaPath ?? vscodeJava.javaPath ?? defaults.javaPath,
      enabled: envJava?.enabled ?? workspaceJava?.enabled ?? defaults.enabled,
    };
  }

  /**
   * Merge Structurizr backend configuration
   * 
   * Applies precedence rules to Structurizr backend configuration.
   * Precedence: environment > workspace > VS Code settings > defaults
   * 
   * @param workspaceConfig - Workspace configuration (may be null)
   * @param envConfig - Environment-specific configuration (may be undefined)
   * @param vscodeConfig - VS Code workspace configuration
   * @returns Fully resolved Structurizr backend configuration
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.3, 13.5, 13.7, 13.8
   */
  mergeStructurizrConfig(
    workspaceConfig: WorkspaceConfig | null,
    envConfig: EndpointConfigurations | undefined,
    vscodeConfig: vscode.WorkspaceConfiguration
  ): Required<StructurizrBackendConfig> {
    // Start with defaults (Requirement 3.4, 10.3, 13.5)
    const defaults: Required<StructurizrBackendConfig> = {
      structurizrCliPath: "structurizr-cli",
      structurizrServerUrl: "http://localhost:8080",
      validateBeforeRender: false,
      enabled: true,
    };

    // Get VS Code settings (Requirement 3.2)
    const vscodeStructurizr = {
      structurizrCliPath: vscodeConfig.get<string>("diagrams.structurizrCliPath"),
      structurizrServerUrl: vscodeConfig.get<string>("diagrams.structurizrServerUrl"),
      validateBeforeRender: vscodeConfig.get<boolean>("diagrams.structurizrValidateBeforeRender"),
      enabled: vscodeConfig.get<boolean>("diagrams.structurizrCliEnabled"),
    };

    // Get workspace config (Requirement 3.3)
    const workspaceStructurizr = workspaceConfig?.endpoints?.structurizr;

    // Get environment config (Requirement 3.1)
    const envStructurizr = envConfig?.structurizr;

    // Merge with precedence: env > workspace > vscode > defaults (Requirement 3.5, 13.7, 13.8)
    return {
      structurizrCliPath: envStructurizr?.structurizrCliPath ?? workspaceStructurizr?.structurizrCliPath ?? vscodeStructurizr.structurizrCliPath ?? defaults.structurizrCliPath,
      structurizrServerUrl: envStructurizr?.structurizrServerUrl ?? workspaceStructurizr?.structurizrServerUrl ?? vscodeStructurizr.structurizrServerUrl ?? defaults.structurizrServerUrl,
      validateBeforeRender: envStructurizr?.validateBeforeRender ?? workspaceStructurizr?.validateBeforeRender ?? vscodeStructurizr.validateBeforeRender ?? defaults.validateBeforeRender,
      enabled: envStructurizr?.enabled ?? workspaceStructurizr?.enabled ?? vscodeStructurizr.enabled ?? defaults.enabled,
    };
  }

  /**
   * Merge rendering configuration
   * 
   * Applies precedence rules to general rendering configuration.
   * Precedence: environment > workspace > VS Code settings > defaults
   * 
   * @param workspaceConfig - Workspace configuration (may be null)
   * @param envConfig - Environment-specific configuration (may be undefined)
   * @param vscodeConfig - VS Code workspace configuration
   * @returns Fully resolved rendering configuration
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  mergeRenderingConfig(
    workspaceConfig: WorkspaceConfig | null,
    envConfig: EndpointConfigurations | undefined,
    vscodeConfig: vscode.WorkspaceConfiguration
  ): Required<RenderingConfig> {
    // Start with defaults (Requirement 3.4)
    const defaults: Required<RenderingConfig> = {
      sourceDirectory: "docs/03_architecture/diagrams/src",
      outputDirectory: "docs/03_architecture/diagrams/out",
      concurrencyLimit: 5,
    };

    // Get VS Code settings (Requirement 3.2)
    const vscodeRendering = {
      sourceDirectory: vscodeConfig.get<string>("diagrams.sourceDirectory"),
      outputDirectory: vscodeConfig.get<string>("diagrams.outputDirectory"),
      concurrencyLimit: vscodeConfig.get<number>("diagrams.concurrencyLimit"),
    };

    // Get workspace config (Requirement 3.3)
    const workspaceRendering = workspaceConfig?.endpoints?.rendering;

    // Get environment config (Requirement 3.1)
    const envRendering = envConfig?.rendering;

    // Merge with precedence: env > workspace > vscode > defaults (Requirement 3.5)
    return {
      sourceDirectory: envRendering?.sourceDirectory ?? workspaceRendering?.sourceDirectory ?? vscodeRendering.sourceDirectory ?? defaults.sourceDirectory,
      outputDirectory: envRendering?.outputDirectory ?? workspaceRendering?.outputDirectory ?? vscodeRendering.outputDirectory ?? defaults.outputDirectory,
      concurrencyLimit: envRendering?.concurrencyLimit ?? workspaceRendering?.concurrencyLimit ?? vscodeRendering.concurrencyLimit ?? defaults.concurrencyLimit,
    };
  }
}
