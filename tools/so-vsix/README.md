 The file should be a markdown file.
# SO Workspace Extension

A VS Code extension that provides chat participants for managing SO (Software Operations) workspace documentation and build processes.

## Features

- **Chat Participant**: Integrates with VS Code's chat interface to assist with workspace management
- **Requirements Inventory Management**: Generate, evaluate, patch, and recheck requirements inventories
- **Objectives Management**: Create and manage project objectives
- **Diagram Evaluation**: Evaluate and patch C4 diagrams (Context and Container levels)
- **Solution Outline Generation**: Create and review solution outlines
- **Workspace Automation**: Render diagrams and build PDF documentation using Docker

## What it supports

- **BRD preprocessing**: Convert BRD Word (.docx) into canonical Markdown for downstream steps
- **Requirements Inventory**: Generate, evaluate, patch, and recheck a structured inventory derived from the BRD
- **Objectives**: Generate and validate Solution Outline Objectives (the blueprint for diagrams and the Solution Outline)
- **Diagrams (C4)**: Evaluate/patch/recheck C4 Context (L1) and C4 Container (L2) diagrams against Objectives + Inventory
- **Solution Outline**: Generate the Solution Outline from Objectives + Diagrams, evaluate it, patch it, and run final review against the Requirements Inventory
- **Build tasks**: Render diagrams and export a consolidated PDF (Docker-based)

## Workspace convention

This extension expects prompts/templates to live inside the workspace (versioned with the project), typically under:

- `agent/prompts/`
- `templates/` (for template files)

## Commands

Commands are available via Command Palette (Ctrl+Shift+P). Search for `SO:`.

### BRD
- `SO: Convert BRD (Word → Markdown)`

### Requirements Inventory
- `SO: Requirements Inventory Generate (Open Chat)`
- `SO: Requirements Inventory Evaluate (Open Chat)`
- `SO: Requirements Inventory Patch (Open Chat)`
- `SO: Requirements Inventory Recheck (Open Chat)`

### Objectives
- `SO: Objectives Generate (Open Chat)`
- `SO: Objectives Evaluate (Open Chat)`
- `SO: Objectives Patch (Open Chat)`
- `SO: Objectives Recheck (Open Chat)`

### Diagrams
- `SO: Diagram Evaluate (Select Diagram)`
- `SO: Diagram Patch (Select Diagram)`
- `SO: Diagram Recheck (Select Diagram)`

### Solution Outline
- `SO: Solution Outline Generate (Open Chat)`
- `SO: Solution Outline Evaluate (Objectives + Diagrams)`
- `SO: Solution Outline Patch (Open Chat)`
- `SO: Solution Outline Final Review (Requirements Inventory)`

### Workspace Tools
- `SO: Render Diagrams (Docker)`
- `SO: 3-03a Render Diagrams (Java)` - Render diagrams using local Java-based tools
- `SO: 3-03b Render Diagrams (Kroki)` - Render diagrams using Kroki cloud service
- `SO: Build PDF (Docker)`
- `SO: Export PDF (Docker)`
- `SO: Clean Build Outputs`
- `SO: Open Generated PDF`

## Usage

1. Open VS Code
2. Access the Command Palette (Ctrl+Shift+P)
3. Search for "SO:" commands to use the extension features
4. For chat-based interactions, use the "so" chat participant in VS Code's chat interface

## Diagram Rendering

The extension provides three options for rendering diagrams (Mermaid, PlantUML, and Structurizr):

### Render Diagrams (Docker)
Uses Docker containers to render diagrams. No local dependencies required beyond Docker.

### Render Diagrams (Java)
Renders diagrams using local Java-based tools for offline rendering without internet connectivity.

**Supported Formats:**
- **Mermaid** (.mmd) - Rendered using Mermaid CLI to SVG
- **PlantUML** (.puml) - Rendered using PlantUML JAR to PNG
- **Structurizr** - Rendered using PlantUML JAR

**Prerequisites:**
- Java Runtime Environment (JRE) 8 or higher
- Mermaid CLI (`mmdc`) - Install with: `npm install -g @mermaid-js/mermaid-cli`
- PlantUML JAR file (included in workspace at `tools/plantuml/plantuml-1.2026.1.jar`)

**Configuration:**
Configure paths in VS Code settings (File > Preferences > Settings, search for "SO Workspace"):

```json
{
  "so-workspace.diagrams.java.plantUmlJarPath": "tools/plantuml/plantuml-1.2026.1.jar",
  "so-workspace.diagrams.java.mermaidCliPath": "mmdc",
  "so-workspace.diagrams.java.javaPath": "java"
}
```

### Render Diagrams (Kroki)
Renders diagrams using the Kroki cloud service. No local dependencies required, but requires internet connectivity.

**Supported Formats:**
- **Mermaid** (.mmd)
- **PlantUML** (.puml)
- **Structurizr**

**Configuration:**
Configure Kroki settings in VS Code settings:

```json
{
  "so-workspace.diagrams.kroki.serviceUrl": "https://kroki.io",
  "so-workspace.diagrams.kroki.maxConcurrent": 5,
  "so-workspace.diagrams.kroki.timeout": 30000
}
```

**Features:**
- No local installation required
- Supports concurrent rendering with rate limiting
- Automatic retry on transient failures

## Workspace Configuration

The extension supports workspace-level configuration through a `.vscode/so-workspace.config.json` file. This allows you to version control endpoint settings and share them with your team.

### Configuration File Location

Create a configuration file at:
```
.vscode/so-workspace.config.json
```

### Configuration Precedence

Settings are resolved in the following order (highest to lowest priority):

1. **Environment-specific config** (from `environments` section in workspace config)
2. **Workspace config** (from `.vscode/so-workspace.config.json`)
3. **VS Code settings** (from User or Workspace settings)
4. **Built-in defaults**

This means workspace configuration overrides VS Code settings, and environment-specific settings override workspace defaults.

### Example Configuration File

```json
{
  "version": "1.0",
  "activeEnvironment": "development",
  
  "endpoints": {
    "kroki": {
      "url": "https://kroki.io",
      "timeout": 30000,
      "maxConcurrent": 5,
      "enabled": true
    },
    "plantuml": {
      "url": "https://www.plantuml.com/plantuml",
      "timeout": 30000,
      "enabled": true
    },
    "java": {
      "plantUmlJarPath": "tools/plantuml/plantuml-1.2026.1.jar",
      "mermaidCliPath": "mmdc",
      "javaPath": "java",
      "enabled": true
    },
    "rendering": {
      "sourceDirectory": "docs/03_architecture/diagrams/src",
      "outputDirectory": "docs/03_architecture/diagrams/out",
      "concurrencyLimit": 5
    }
  },
  
  "environments": {
    "development": {
      "kroki": {
        "url": "http://localhost:8000",
        "timeout": 60000,
        "maxConcurrent": 10
      }
    },
    "staging": {
      "kroki": {
        "url": "https://kroki-staging.example.com",
        "timeout": 45000
      }
    },
    "production": {
      "kroki": {
        "url": "https://kroki.example.com",
        "timeout": 30000,
        "maxConcurrent": 3
      }
    }
  }
}
```

### Environment Support

The configuration file supports multiple environments, allowing you to easily switch between development, staging, and production endpoints.

**To switch environments:**
1. Open Command Palette (Ctrl+Shift+P)
2. Run `SO: Switch Endpoint Environment`
3. Select the desired environment from the list

The extension will automatically reload the configuration and use the selected environment's settings.

**Default Environment:**
If no `activeEnvironment` is specified, the extension uses the "default" environment (or falls back to the base `endpoints` configuration).

### Generating a Configuration File

To quickly create a workspace configuration file with default values:

1. Open Command Palette (Ctrl+Shift+P)
2. Run `SO: Generate Workspace Config`
3. The extension will create `.vscode/so-workspace.config.json` with sensible defaults

If the file already exists, you'll be prompted before overwriting.

### Dynamic Configuration Reloading

The extension automatically watches for changes to `.vscode/so-workspace.config.json`. When you modify the file, the configuration is reloaded automatically without requiring a VS Code restart.

You'll see a notification when the configuration is successfully reloaded.

### Configuration Schema

See the [Configuration Schema Documentation](#configuration-schema-documentation) section below for detailed information about all available configuration fields.

## Configuration Schema Documentation

This section provides detailed documentation for all available configuration fields in `.vscode/so-workspace.config.json`.

### Root Configuration Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | No | Schema version for future compatibility. Current version: "1.0" |
| `activeEnvironment` | string | No | Name of the active environment. Defaults to "default" if not specified |
| `endpoints` | object | No | Base endpoint configurations (see [Endpoint Configurations](#endpoint-configurations)) |
| `environments` | object | No | Environment-specific configurations (see [Environments](#environments)) |

### Endpoint Configurations

The `endpoints` object contains configuration for all external services and rendering settings.

#### Kroki Endpoint Configuration

Configuration for the Kroki cloud service.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | "https://kroki.io" | Kroki service URL |
| `timeout` | number | No | 30000 | Request timeout in milliseconds |
| `maxConcurrent` | number | No | 5 | Maximum number of concurrent requests |
| `enabled` | boolean | No | true | Whether this endpoint is enabled |

**Example:**
```json
{
  "endpoints": {
    "kroki": {
      "url": "https://kroki.io",
      "timeout": 30000,
      "maxConcurrent": 5,
      "enabled": true
    }
  }
}
```

#### PlantUML Endpoint Configuration

Configuration for PlantUML server endpoints.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | "https://www.plantuml.com/plantuml" | PlantUML server URL |
| `timeout` | number | No | 30000 | Request timeout in milliseconds |
| `enabled` | boolean | No | true | Whether this endpoint is enabled |

**Example:**
```json
{
  "endpoints": {
    "plantuml": {
      "url": "https://www.plantuml.com/plantuml",
      "timeout": 30000,
      "enabled": true
    }
  }
}
```

#### Java Backend Configuration

Configuration for local Java-based diagram rendering.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `plantUmlJarPath` | string | No | "tools/plantuml/plantuml-1.2026.1.jar" | Path to PlantUML JAR file (relative to workspace root) |
| `mermaidCliPath` | string | No | "mmdc" | Path to Mermaid CLI executable |
| `javaPath` | string | No | "java" | Path to Java executable |
| `enabled` | boolean | No | true | Whether this backend is enabled |

**Example:**
```json
{
  "endpoints": {
    "java": {
      "plantUmlJarPath": "tools/plantuml/plantuml-1.2026.1.jar",
      "mermaidCliPath": "mmdc",
      "javaPath": "java",
      "enabled": true
    }
  }
}
```

**Path Resolution:**
- Relative paths are resolved from the workspace root
- Absolute paths are used as-is
- Executable names (like "java" or "mmdc") are resolved from system PATH

#### Rendering Configuration

General diagram rendering settings.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sourceDirectory` | string | No | "docs/03_architecture/diagrams/src" | Directory containing source diagram files |
| `outputDirectory` | string | No | "docs/03_architecture/diagrams/out" | Directory for rendered diagram output |
| `concurrencyLimit` | number | No | 5 | Maximum number of concurrent rendering operations |

**Example:**
```json
{
  "endpoints": {
    "rendering": {
      "sourceDirectory": "docs/03_architecture/diagrams/src",
      "outputDirectory": "docs/03_architecture/diagrams/out",
      "concurrencyLimit": 5
    }
  }
}
```

### Environments

The `environments` object allows you to define environment-specific configurations. Each environment is a named object containing endpoint configurations that override the base `endpoints` settings.

**Structure:**
```json
{
  "environments": {
    "environment-name": {
      "kroki": { /* Kroki config overrides */ },
      "plantuml": { /* PlantUML config overrides */ },
      "java": { /* Java config overrides */ },
      "rendering": { /* Rendering config overrides */ }
    }
  }
}
```

**Example with Multiple Environments:**
```json
{
  "activeEnvironment": "development",
  "endpoints": {
    "kroki": {
      "url": "https://kroki.io",
      "timeout": 30000
    }
  },
  "environments": {
    "development": {
      "kroki": {
        "url": "http://localhost:8000",
        "timeout": 60000,
        "maxConcurrent": 10
      }
    },
    "staging": {
      "kroki": {
        "url": "https://kroki-staging.example.com",
        "timeout": 45000
      }
    },
    "production": {
      "kroki": {
        "url": "https://kroki.example.com",
        "timeout": 30000,
        "maxConcurrent": 3
      }
    }
  }
}
```

**Environment Resolution:**
1. The `activeEnvironment` field specifies which environment to use
2. Settings from the active environment override base `endpoints` settings
3. Only specified fields are overridden; other fields use base values
4. If `activeEnvironment` is not set, only base `endpoints` are used

### Complete Configuration Example

Here's a complete example showing all available configuration options:

```json
{
  "version": "1.0",
  "activeEnvironment": "development",
  
  "endpoints": {
    "kroki": {
      "url": "https://kroki.io",
      "timeout": 30000,
      "maxConcurrent": 5,
      "enabled": true
    },
    "plantuml": {
      "url": "https://www.plantuml.com/plantuml",
      "timeout": 30000,
      "enabled": true
    },
    "java": {
      "plantUmlJarPath": "tools/plantuml/plantuml-1.2026.1.jar",
      "mermaidCliPath": "mmdc",
      "javaPath": "java",
      "enabled": true
    },
    "rendering": {
      "sourceDirectory": "docs/03_architecture/diagrams/src",
      "outputDirectory": "docs/03_architecture/diagrams/out",
      "concurrencyLimit": 5
    }
  },
  
  "environments": {
    "development": {
      "kroki": {
        "url": "http://localhost:8000",
        "timeout": 60000,
        "maxConcurrent": 10
      },
      "java": {
        "plantUmlJarPath": "tools/plantuml/plantuml-dev.jar"
      }
    },
    "staging": {
      "kroki": {
        "url": "https://kroki-staging.example.com",
        "timeout": 45000
      }
    },
    "production": {
      "kroki": {
        "url": "https://kroki.example.com",
        "timeout": 30000,
        "maxConcurrent": 3
      },
      "rendering": {
        "concurrencyLimit": 3
      }
    }
  }
}
```

### Field Type Reference

**String Fields:**
- Must be enclosed in double quotes
- Can contain any valid JSON string characters
- Paths can use forward slashes (/) on all platforms

**Number Fields:**
- Must be valid integers or decimals
- No quotes
- Timeouts are in milliseconds (e.g., 30000 = 30 seconds)

**Boolean Fields:**
- Must be `true` or `false` (lowercase, no quotes)

**Object Fields:**
- Must be valid JSON objects enclosed in curly braces `{}`
- Can be nested

## Requirements

- VS Code 1.109.0 or higher
- Node.js 18.12.0 or higher (required for Jest 30)
- Docker (for diagram rendering and PDF building)
- **Pandoc** (required for Word → Markdown conversion)

## Prerequisites

### Pandoc (required for Word → Markdown)

The workflow expects BRDs to be provided as Word (.docx). Pandoc is used to convert `.docx` to canonical Markdown.

Verify installation:

```bash
pandoc --version
```

Install Pandoc:
- **Windows**: Download from https://pandoc.org/installing.html
- **macOS**: `brew install pandoc`
- **Linux**: `sudo apt-get install pandoc` or `sudo yum install pandoc`

### Java (optional, for Java-based diagram rendering)

Required only if using the "Render Diagrams (Java)" command.

Verify installation:

```bash
java -version
```

Install Java:
- **Windows**: Download from https://adoptium.net/
- **macOS**: `brew install openjdk`
- **Linux**: `sudo apt-get install default-jre` or `sudo yum install java-11-openjdk`

### Mermaid CLI (optional, for Java-based Mermaid rendering)

Required only if using the "Render Diagrams (Java)" command with Mermaid diagrams.

Install Mermaid CLI:

```bash
npm install -g @mermaid-js/mermaid-cli
```

Verify installation:

```bash
mmdc --version
```

**Note**: Mermaid CLI requires Node.js and npm to be installed.


## Troubleshooting

### Configuration File Issues

#### Error: "Invalid JSON in workspace config"

**Cause**: The `.vscode/so-workspace.config.json` file contains syntax errors.

**Solutions**:
1. Check for common JSON syntax errors:
   - Missing or extra commas
   - Missing closing brackets `}` or `]`
   - Missing quotes around string values
   - Single quotes instead of double quotes
   - Trailing commas (not allowed in JSON)

2. Use a JSON validator to identify the exact error:
   - VS Code's built-in JSON validation (open the file and check for red squiggles)
   - Online validators like https://jsonlint.com/

3. Example of common errors:
   ```json
   // ❌ Wrong - trailing comma
   {
     "version": "1.0",
     "endpoints": {},
   }
   
   // ✅ Correct
   {
     "version": "1.0",
     "endpoints": {}
   }
   ```

**Fallback Behavior**: When the configuration file has invalid JSON, the extension will display an error message and fall back to using VS Code settings.

#### Error: "Config version must be a string"

**Cause**: The `version` field has an incorrect type.

**Solutions**:
1. Ensure the `version` field is a string enclosed in quotes:
   ```json
   // ❌ Wrong
   {
     "version": 1.0
   }
   
   // ✅ Correct
   {
     "version": "1.0"
   }
   ```

#### Error: "Kroki URL must be a string"

**Cause**: The Kroki URL field has an incorrect type or is missing.

**Solutions**:
1. Ensure the URL is a string enclosed in quotes:
   ```json
   {
     "endpoints": {
       "kroki": {
         "url": "https://kroki.io"
       }
     }
   }
   ```

2. Check that the URL is valid and includes the protocol (http:// or https://)

#### Error: "Kroki timeout must be a number"

**Cause**: The timeout field has an incorrect type.

**Solutions**:
1. Ensure timeout is a number without quotes:
   ```json
   // ❌ Wrong
   {
     "endpoints": {
       "kroki": {
         "timeout": "30000"
       }
     }
   }
   
   // ✅ Correct
   {
     "endpoints": {
       "kroki": {
         "timeout": 30000
       }
     }
   }
   ```

2. Timeout values are in milliseconds (30000 = 30 seconds)

#### Error: "Configuration validation failed"

**Cause**: One or more fields in the configuration file have invalid values or types.

**Solutions**:
1. Check the error message for specific field names and expected types
2. Refer to the [Configuration Schema Documentation](#configuration-schema-documentation) for valid field types
3. Common validation issues:
   - Boolean fields must be `true` or `false` (lowercase, no quotes)
   - Number fields must not have quotes
   - String fields must have quotes
   - Required fields (like `url` in endpoint configs) must be present

**Fallback Behavior**: When validation fails, the extension will display an error message with details about which field failed validation, then fall back to using VS Code settings.

#### Warning: "No workspace config found, using defaults"

**Cause**: The `.vscode/so-workspace.config.json` file doesn't exist.

**This is not an error** - it's expected behavior when you haven't created a workspace configuration file yet.

**Solutions**:
1. If you want to use workspace configuration, create the file:
   - Run `SO: Generate Workspace Config` command
   - Or manually create `.vscode/so-workspace.config.json`

2. If you prefer using VS Code settings, no action is needed

#### Error: "Permission denied reading .vscode/so-workspace.config.json"

**Cause**: Insufficient file permissions.

**Solutions**:
1. Check file permissions:
   - On Windows: Right-click file > Properties > Security
   - On macOS/Linux: `ls -la .vscode/so-workspace.config.json`

2. Ensure your user account has read permissions

3. On Windows, try running VS Code as administrator (not recommended for regular use)

#### Configuration Changes Not Taking Effect

**Cause**: The file watcher may not have detected the change, or there's a caching issue.

**Solutions**:
1. Save the configuration file (Ctrl+S) to trigger the file watcher

2. Check for a notification that says "Workspace configuration reloaded successfully"

3. If no notification appears, manually reload VS Code:
   - Open Command Palette (Ctrl+Shift+P)
   - Run "Developer: Reload Window"

4. Check the VS Code Output panel for errors:
   - View > Output
   - Select "SO Workspace Extension" from the dropdown

#### Environment Not Found

**Cause**: The `activeEnvironment` field references an environment that doesn't exist in the `environments` section.

**Solutions**:
1. Check that the environment name matches exactly (case-sensitive):
   ```json
   {
     "activeEnvironment": "development",
     "environments": {
       "development": { /* config */ }
     }
   }
   ```

2. Use the `SO: Switch Endpoint Environment` command to see available environments

3. If the environment doesn't exist, either:
   - Create it in the `environments` section
   - Change `activeEnvironment` to an existing environment
   - Remove `activeEnvironment` to use base configuration

**Fallback Behavior**: If the specified environment doesn't exist, the extension will use the base `endpoints` configuration.

### Configuration Precedence Issues

#### Settings Not Being Applied

**Cause**: Configuration precedence may be overriding your settings.

**Understanding Precedence** (highest to lowest):
1. Environment-specific config (in workspace file)
2. Workspace config (in workspace file)
3. VS Code settings
4. Built-in defaults

**Solutions**:
1. Check if a workspace configuration file exists:
   - Look for `.vscode/so-workspace.config.json`
   - If it exists, it will override VS Code settings

2. To use VS Code settings instead:
   - Delete or rename `.vscode/so-workspace.config.json`
   - Or remove the specific setting from the workspace config

3. To override workspace config:
   - Use environment-specific configuration
   - Switch to an environment that has your desired settings

4. To debug precedence:
   - Check the VS Code Output panel (View > Output > "SO Workspace Extension")
   - Look for "Configuration reloaded" messages showing the resolved config

### Fallback Behavior Summary

The extension is designed to be resilient to configuration errors:

| Error Type | Fallback Behavior |
|------------|-------------------|
| Configuration file not found | Use VS Code settings + defaults |
| Invalid JSON syntax | Display error, use VS Code settings + defaults |
| Schema validation failure | Display error with field details, use VS Code settings + defaults |
| Missing required fields | Display error, use VS Code settings + defaults |
| Environment not found | Use base `endpoints` configuration |
| File permission errors | Display error, use VS Code settings + defaults |

**Key Points**:
- The extension will **never crash** due to configuration errors
- You'll always see an error message explaining what went wrong
- The extension will continue working with fallback settings
- Detailed diagnostic information is logged to the Output panel

### Diagram Rendering Issues

#### Java Backend Issues

**Error: "Java backend is not available. Please ensure Java is installed and PlantUML JAR is at the configured path."**

**Cause**: Java is not installed, not in PATH, or the PlantUML JAR path is incorrect.

**Solutions**:
1. Verify Java is installed:
   ```bash
   java -version
   ```
   If not installed, see [Prerequisites](#prerequisites) section.

2. Check PlantUML JAR path in VS Code settings:
   - Open Settings (File > Preferences > Settings)
   - Search for "so-workspace.diagrams.java.plantUmlJarPath"
   - Verify the path points to a valid PlantUML JAR file
   - Default: `tools/plantuml/plantuml-1.2026.1.jar`

3. If Java is installed but not in PATH, specify the full path in settings:
   ```json
   {
     "so-workspace.diagrams.java.javaPath": "C:\\Program Files\\Java\\jdk-11\\bin\\java.exe"
   }
   ```

**Error: "Mermaid CLI (mmdc) not found. Please install with: npm install -g @mermaid-js/mermaid-cli"**

**Cause**: Mermaid CLI is not installed or not in PATH.

**Solutions**:
1. Install Mermaid CLI globally:
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```

2. Verify installation:
   ```bash
   mmdc --version
   ```

3. If installed but not found, specify the full path in settings:
   ```json
   {
     "so-workspace.diagrams.java.mermaidCliPath": "C:\\Users\\YourName\\AppData\\Roaming\\npm\\mmdc.cmd"
   }
   ```

**Error: "Invalid diagram syntax in {file}: {error details}"**

**Cause**: The diagram source file contains syntax errors.

**Solutions**:
1. Open the diagram file and check for syntax errors
2. For Mermaid diagrams, validate syntax at https://mermaid.live/
3. For PlantUML diagrams, validate syntax at https://www.plantuml.com/plantuml/
4. Common issues:
   - Missing closing brackets or quotes
   - Invalid node identifiers (use quotes for special characters)
   - Incorrect indentation in Mermaid diagrams

**Error: "PlantUML rendering failed: Error reading JAR file"**

**Cause**: The PlantUML JAR file is corrupted or the path is incorrect.

**Solutions**:
1. Download a fresh copy of PlantUML JAR from https://plantuml.com/download
2. Place it in the `tools/plantuml/` directory
3. Update the path in VS Code settings if using a different location

#### Kroki Backend Issues

**Error: "Kroki service is unreachable. Please check your internet connection or try again later."**

**Cause**: No internet connection, Kroki service is down, or firewall is blocking the request.

**Solutions**:
1. Check your internet connection
2. Verify Kroki service status at https://kroki.io/
3. Check if your firewall or proxy is blocking requests to kroki.io
4. If using a corporate network, configure proxy settings in VS Code
5. Try using the Java backend instead for offline rendering

**Error: "Kroki API request timeout"**

**Cause**: The request took too long, possibly due to slow network or large diagram.

**Solutions**:
1. Increase timeout in VS Code settings:
   ```json
   {
     "so-workspace.diagrams.kroki.timeout": 60000
   }
   ```
   (Value is in milliseconds, 60000 = 60 seconds)

2. For very large diagrams, consider using the Java backend instead

**Error: "Kroki API rate limit exceeded"**

**Cause**: Too many concurrent requests to Kroki service.

**Solutions**:
1. Reduce concurrent requests in VS Code settings:
   ```json
   {
     "so-workspace.diagrams.kroki.maxConcurrent": 3
   }
   ```

2. Wait a few minutes before retrying

**Error: "Kroki API returned error: {error message}"**

**Cause**: The diagram syntax is invalid or the diagram type is not supported.

**Solutions**:
1. Check the error message for specific syntax issues
2. Validate diagram syntax using online validators
3. Ensure the diagram type is supported by Kroki (Mermaid, PlantUML, Structurizr)

#### General Rendering Issues

**Error: "No diagram files found in workspace"**

**Cause**: No .mmd or .puml files exist in the workspace, or they are in excluded directories.

**Solutions**:
1. Verify diagram files exist in your workspace
2. Check file extensions (.mmd for Mermaid, .puml for PlantUML)
3. Ensure diagram files are not in excluded directories (node_modules, .git, etc.)

**Error: "Failed to write output file: Permission denied"**

**Cause**: Insufficient permissions to write to the output directory.

**Solutions**:
1. Check file permissions on the output directory (typically `docs/03_architecture/diagrams/out/`)
2. Ensure the directory is not read-only
3. On Windows, run VS Code as administrator if necessary
4. Check if another process has the file open

**Error: "Output directory creation failed"**

**Cause**: Insufficient permissions or invalid path.

**Solutions**:
1. Verify the workspace path does not contain special characters
2. Check available disk space
3. Ensure parent directories exist and are writable

### Performance Issues

**Rendering is very slow**

**Solutions**:
1. For Java backend:
   - Ensure Java has sufficient memory (add `-Xmx512m` to Java args if needed)
   - Close other Java applications to free up resources

2. For Kroki backend:
   - Check network speed
   - Reduce concurrent requests in settings
   - Consider using Java backend for offline rendering

**Extension is unresponsive during rendering**

**Cause**: Large number of diagrams being processed.

**Solutions**:
1. Rendering happens in the background; VS Code should remain responsive
2. Check the progress notification for status
3. If truly frozen, reload VS Code window (Ctrl+Shift+P > "Reload Window")

### Getting Help

If you encounter issues not covered here:

1. Check the VS Code Output panel (View > Output, select "SO Workspace Extension")
2. Check the VS Code Developer Console (Help > Toggle Developer Tools)
3. Review error messages carefully - they often contain specific solutions
4. Ensure all prerequisites are installed and configured correctly
5. Try the alternative rendering backend (Java vs Kroki) to isolate the issue

For bug reports or feature requests, please include:
- VS Code version
- Extension version
- Operating system
- Complete error message
- Steps to reproduce the issue
- Sample diagram file (if applicable)
