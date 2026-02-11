/**
 * Configuration Schema and Types
 * 
 * Defines TypeScript interfaces for workspace-level configuration file support.
 * Enables dynamic management of external service endpoints (Kroki, PlantUML, etc.)
 * through a `.vscode/so-workspace.config.json` file.
 * 
 * Configuration precedence: environment config > workspace config > VS Code settings > defaults
 */

// ============================================================================
// Workspace Configuration Schema
// ============================================================================

/**
 * Workspace configuration file schema
 * Located at .vscode/so-workspace.config.json
 * 
 * This is the root configuration object that defines all workspace-level
 * settings for external service endpoints and rendering behavior.
 */
export interface WorkspaceConfig {
  /**
   * Schema version for future compatibility
   * Allows for versioned configuration format changes
   * @example "1.0"
   */
  version?: string;

  /**
   * Active environment name
   * References an environment defined in the environments section
   * @default "default"
   * @example "development", "staging", "production"
   */
  activeEnvironment?: string;

  /**
   * Default endpoint configurations
   * Applied when no environment is active or as base configuration
   */
  endpoints?: EndpointConfigurations;

  /**
   * Environment-specific configurations
   * Each environment can override default endpoint settings
   * Environment settings take precedence over default endpoints
   * @example { "development": {...}, "production": {...} }
   */
  environments?: Record<string, EndpointConfigurations>;
}

// ============================================================================
// Endpoint Configurations
// ============================================================================

/**
 * Endpoint configurations for external services
 * 
 * Groups all external service endpoint settings in one object.
 * Each service can be independently configured or disabled.
 */
export interface EndpointConfigurations {
  /**
   * Kroki cloud service configuration
   * Used for rendering diagrams via Kroki HTTP API
   */
  kroki?: KrokiEndpointConfig;

  /**
   * PlantUML server configuration
   * Used for rendering PlantUML diagrams via HTTP server
   */
  plantuml?: PlantUMLEndpointConfig;

  /**
   * Java backend configuration
   * Used for local diagram rendering with PlantUML JAR and Mermaid CLI
   */
  java?: JavaBackendConfig;

  /**
   * Structurizr backend configuration
   * Used for rendering Structurizr DSL files with Structurizr CLI
   */
  structurizr?: StructurizrBackendConfig;

  /**
   * General diagram rendering settings
   * Applies to all rendering backends
   */
  rendering?: RenderingConfig;
}

// ============================================================================
// Kroki Endpoint Configuration
// ============================================================================

/**
 * Kroki endpoint configuration
 * 
 * Configures the Kroki cloud service for diagram rendering.
 * Kroki supports multiple diagram types (Mermaid, PlantUML, Structurizr, etc.)
 * through a unified HTTP API.
 */
export interface KrokiEndpointConfig {
  /**
   * Kroki service URL
   * @default "https://kroki.io"
   * @example "https://kroki.io", "http://localhost:8000"
   */
  url: string;

  /**
   * Request timeout in milliseconds
   * Maximum time to wait for Kroki API response
   * @default 30000
   * @example 30000, 60000
   */
  timeout?: number;

  /**
   * Maximum concurrent requests
   * Limits parallel API calls to prevent overwhelming the service
   * @default 5
   * @example 5, 10, 20
   */
  maxConcurrent?: number;

  /**
   * Whether this endpoint is enabled
   * When false, this backend will not be used for rendering
   * @default true
   */
  enabled?: boolean;
}

// ============================================================================
// PlantUML Endpoint Configuration
// ============================================================================

/**
 * PlantUML server endpoint configuration
 * 
 * Configures a PlantUML HTTP server for diagram rendering.
 * Alternative to Kroki for PlantUML-specific rendering.
 */
export interface PlantUMLEndpointConfig {
  /**
   * PlantUML server URL
   * @default "https://www.plantuml.com/plantuml"
   * @example "https://www.plantuml.com/plantuml", "http://localhost:8080/plantuml"
   */
  url: string;

  /**
   * Request timeout in milliseconds
   * Maximum time to wait for server response
   * @default 30000
   * @example 30000, 45000
   */
  timeout?: number;

  /**
   * Whether this endpoint is enabled
   * When false, this backend will not be used for rendering
   * @default true
   */
  enabled?: boolean;
}

// ============================================================================
// Java Backend Configuration
// ============================================================================

/**
 * Java backend configuration
 * 
 * Configures local Java-based rendering tools.
 * Enables offline diagram rendering without cloud services.
 * Requires Java runtime and appropriate CLI tools.
 */
export interface JavaBackendConfig {
  /**
   * Path to PlantUML JAR file
   * Can be relative to workspace root or absolute path
   * @example "tools/plantuml/plantuml-1.2026.1.jar", "/usr/local/lib/plantuml.jar"
   */
  plantUmlJarPath?: string;

  /**
   * Path to Mermaid CLI executable (mmdc)
   * Can be command name in PATH or absolute path
   * @default "mmdc"
   * @example "mmdc", "/usr/local/bin/mmdc", "node_modules/.bin/mmdc"
   */
  mermaidCliPath?: string;

  /**
   * Java executable path
   * Can be command name in PATH or absolute path
   * @default "java"
   * @example "java", "/usr/bin/java", "C:\\Program Files\\Java\\jdk-17\\bin\\java.exe"
   */
  javaPath?: string;

  /**
   * Whether this backend is enabled
   * When false, Java backend will not be used for rendering
   * @default true
   */
  enabled?: boolean;
}

// ============================================================================
// Structurizr Backend Configuration
// ============================================================================

/**
 * Structurizr backend configuration
 * 
 * Configures Structurizr CLI for rendering C4 architecture diagrams.
 * Enables rendering of Structurizr DSL files to SVG format.
 * Requires Structurizr CLI and Java runtime.
 */
export interface StructurizrBackendConfig {
  /**
   * Path to Structurizr CLI executable
   * Can be command name in PATH or absolute path
   * @default "structurizr-cli"
   * @example "structurizr-cli", "/usr/local/bin/structurizr-cli", "C:\\tools\\structurizr-cli\\structurizr-cli.bat"
   */
  structurizrCliPath?: string;

  /**
   * Structurizr server URL for DSL validation
   * Used to validate DSL files against Structurizr server API
   * Supports both Structurizr Lite (local) and Structurizr Cloud
   * @default "http://localhost:8080"
   * @example "http://localhost:8080", "https://api.structurizr.com"
   */
  structurizrServerUrl?: string;

  /**
   * Whether to validate DSL files before rendering
   * When true, DSL files are validated against Structurizr server before rendering
   * Validation errors are displayed, but user can choose to proceed with rendering
   * @default false
   */
  validateBeforeRender?: boolean;

  /**
   * Whether this backend is enabled
   * When false, Structurizr backend will not be used for rendering
   * @default true
   */
  enabled?: boolean;
}

// ============================================================================
// Rendering Configuration
// ============================================================================

/**
 * General rendering configuration
 * 
 * Settings that apply to all rendering backends.
 * Controls file locations and rendering behavior.
 */
export interface RenderingConfig {
  /**
   * Source directory for diagram files
   * Relative to workspace root
   * @default "docs/03_architecture/diagrams/src"
   * @example "diagrams/src", "docs/diagrams"
   */
  sourceDirectory?: string;

  /**
   * Output directory for rendered diagrams
   * Relative to workspace root
   * @default "docs/03_architecture/diagrams/out"
   * @example "diagrams/out", "docs/rendered"
   */
  outputDirectory?: string;

  /**
   * Concurrency limit for rendering operations
   * Maximum number of diagrams to render in parallel
   * @default 5
   * @example 5, 10, 20
   */
  concurrencyLimit?: number;
}

// ============================================================================
// Resolved Configuration
// ============================================================================

/**
 * Resolved configuration after merging all sources
 * 
 * This is the final configuration object used by command handlers.
 * Created by merging workspace config, VS Code settings, and defaults
 * according to precedence rules.
 * 
 * All optional fields are resolved to concrete values.
 */
export interface ResolvedConfig {
  /**
   * Resolved Kroki endpoint configuration
   * All fields have concrete values after merging
   */
  kroki: Required<KrokiEndpointConfig>;

  /**
   * Resolved PlantUML endpoint configuration
   * All fields have concrete values after merging
   */
  plantuml: Required<PlantUMLEndpointConfig>;

  /**
   * Resolved Java backend configuration
   * All fields have concrete values after merging
   */
  java: Required<JavaBackendConfig>;

  /**
   * Resolved Structurizr backend configuration
   * All fields have concrete values after merging
   */
  structurizr: Required<StructurizrBackendConfig>;

  /**
   * Resolved rendering configuration
   * All fields have concrete values after merging
   */
  rendering: Required<RenderingConfig>;
}
