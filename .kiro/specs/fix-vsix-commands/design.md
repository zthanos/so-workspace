# Design Document: Fix VSIX Commands

## Overview

This design addresses the issue where VSCode extension commands are not being recognized after adding the plantuml-wasm-based diagram rendering functionality. The solution involves ensuring proper build configuration, dependency bundling, extension packaging, and installation procedures. The design maintains the JavaScript-based PlantUML rendering approach using plantuml-wasm while ensuring all extension commands are properly registered and available in VSCode.

## Architecture

The solution follows a multi-stage pipeline:

1. **Build Stage**: Compile TypeScript to JavaScript and bundle dependencies
2. **Package Stage**: Create a VSIX file with all required assets
3. **Installation Stage**: Install the VSIX into VSCode
4. **Runtime Stage**: Extension activation and command registration

### Key Components

- **TypeScript Compiler**: Transpiles .ts files to .js files in dist/
- **VSCode Extension Packager (vsce)**: Creates .vsix files from extension source
- **Extension Activation System**: VSCode's extension host that loads and activates extensions
- **Command Registry**: VSCode's command system that maps command IDs to handler functions
- **plantuml-wasm Module**: WebAssembly-based PlantUML renderer

## Components and Interfaces

### 1. Build System

**Responsibility**: Compile TypeScript and prepare extension for packaging

**Key Files**:
- `tsconfig.json`: TypeScript compiler configuration
- `package.json`: Build scripts and dependencies
- `src/**/*.ts`: Source TypeScript files
- `dist/**/*.js`: Compiled JavaScript output

**Build Process**:
```
npm install → npm run compile → npm run copy-scripts
```

**Configuration Requirements**:
- TypeScript target: ES2020 or compatible
- Module system: CommonJS (required by VSCode)
- Source maps: Enabled for debugging
- Output directory: `dist/`

### 2. Dependency Management

**Responsibility**: Ensure all runtime dependencies are available

**Dependencies**:
- `plantuml-wasm`: Runtime dependency for diagram rendering
- `@types/vscode`: Development dependency for VSCode API types
- `@types/node`: Development dependency for Node.js types

**Bundling Strategy**:
- Runtime dependencies must be in `dependencies` (not `devDependencies`)
- VSCode extension host will load dependencies from `node_modules/`
- plantuml-wasm WASM files must be accessible at runtime

### 3. Extension Packaging

**Responsibility**: Create installable VSIX file

**Tool**: `@vscode/vsce` (Visual Studio Code Extension packager)

**Package Contents**:
- `package.json`: Extension manifest
- `dist/`: Compiled JavaScript files
- `node_modules/`: Runtime dependencies
- `README.md`: Extension documentation
- `.vscodeignore`: Files to exclude from package

**Packaging Command**:
```bash
npx vsce package
```

**Output**: `so-vsix-{version}.vsix`

### 4. Extension Activation

**Responsibility**: Register commands when extension loads

**Activation Events** (from package.json):
```json
"activationEvents": [
  "onCommand:so-workspace.diagram.eval",
  "onCommand:so-workspace.renderDiagrams",
  ...
]
```

**Activation Flow**:
1. User invokes command from Command Palette
2. VSCode checks if extension is activated
3. If not activated, VSCode loads extension and calls `activate()`
4. Extension registers all commands
5. VSCode executes the requested command

### 5. Command Registration

**Responsibility**: Map command IDs to handler functions

**Implementation** (in `extension.ts`):
```typescript
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.diagram.eval", diagramEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.renderDiagrams", renderDiagrams),
    // ... other commands
  );
}
```

**Command Declaration** (in `package.json`):
```json
"contributes": {
  "commands": [
    {
      "command": "so-workspace.diagram.eval",
      "title": "SO: Diagram Evaluate (Select Diagram)"
    },
    {
      "command": "so-workspace.renderDiagrams",
      "title": "SO: Render Diagrams (Local)"
    }
  ]
}
```

### 6. PlantUML-WASM Integration

**Responsibility**: Render PlantUML diagrams to SVG using JavaScript

**Module**: `plantuml-wasm`

**API Usage**:
```typescript
import * as plantuml from "plantuml-wasm";

const svg = await plantuml.generateSVG(pumlContent);
```

**File Processing Flow**:
1. Scan `docs/03_architecture/diagrams/src/` for `.puml` files
2. Read each file's content
3. Process includes (replace remote C4 includes with local paths if available)
4. Call `plantuml.generateSVG(content)`
5. Write SVG output to `docs/03_architecture/diagrams/out/`

## Data Models

### Extension Context
```typescript
interface ExtensionContext {
  subscriptions: Disposable[];
  extensionPath: string;
  // ... other VSCode-provided properties
}
```

### Command Registration
```typescript
interface CommandRegistration {
  commandId: string;        // e.g., "so-workspace.diagram.eval"
  handler: (...args: any[]) => any;
  thisArg?: any;
}
```

### Diagram File
```typescript
interface DiagramFile {
  sourcePath: string;       // Full path to .puml file
  content: string;          // PlantUML source code
  outputPath: string;       // Full path to .svg output
  relativePath: string;     // Relative path from src root
}
```

### Build Configuration
```typescript
interface BuildConfig {
  sourceDir: string;        // "src/"
  outputDir: string;        // "dist/"
  tsConfigPath: string;     // "tsconfig.json"
  packageJsonPath: string;  // "package.json"
}
```

## Correctness Properties


A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: TypeScript Compilation Completeness

*For any* TypeScript source file in the `src/` directory, after running the build process, there should exist a corresponding compiled JavaScript file in the `dist/` directory with the same relative path and base name.

**Validates: Requirements 1.1**

### Property 2: Command Registration Completeness

*For any* command declared in the `contributes.commands` section of `package.json`, when the extension is activated, that command should be registered and available in VSCode's command registry.

**Validates: Requirements 3.4, 4.3**

### Property 3: PlantUML File Processing

*For any* `.puml` file in the source diagrams directory, the renderDiagrams function should be able to read its content without errors.

**Validates: Requirements 5.2**

### Property 4: PlantUML to SVG Conversion

*For any* valid PlantUML content string, calling `plantuml.generateSVG()` should produce a non-empty string containing valid SVG markup (starting with `<svg` and ending with `</svg>`).

**Validates: Requirements 5.3**

### Property 5: Output File Generation

*For any* `.puml` file successfully processed by renderDiagrams, there should exist a corresponding `.svg` file in the output directory with the same relative path and base name.

**Validates: Requirements 5.4**

### Property 6: Error Message Display

*For any* error that occurs during diagram rendering (file read errors, conversion errors, write errors), the extension should display an error message to the user via `vscode.window.showErrorMessage()`.

**Validates: Requirements 5.5**

### Property 7: Command Handler Execution

*For any* registered command, when invoked through VSCode's command system, the corresponding handler function should be executed.

**Validates: Requirements 4.4**

## Error Handling

### Build Errors

**TypeScript Compilation Errors**:
- Display compilation errors in terminal output
- Exit with non-zero status code
- Preserve error messages for debugging

**Dependency Installation Errors**:
- Display npm error messages
- Check for network connectivity issues
- Verify package.json validity

### Packaging Errors

**VSCE Packaging Errors**:
- Validate package.json before packaging
- Check for missing required fields
- Verify file paths in .vscodeignore

**Missing Files**:
- Ensure dist/ folder exists before packaging
- Verify node_modules contains required dependencies
- Check for required metadata files (README, LICENSE)

### Runtime Errors

**Module Loading Errors**:
- Catch import errors for plantuml-wasm
- Display user-friendly error messages
- Log detailed errors to extension output channel

**File System Errors**:
- Handle missing source directories
- Handle permission errors when writing output files
- Create output directories if they don't exist

**PlantUML Rendering Errors**:
- Catch syntax errors in PlantUML files
- Display file name and error details
- Continue processing remaining files after error

### Installation Errors

**Extension Installation Errors**:
- Check if VSCode is running (cannot install while running)
- Verify VSIX file exists before installation
- Display clear error messages for installation failures

## Testing Strategy

### Unit Tests

Unit tests will focus on specific examples and edge cases:

1. **Build System Tests**:
   - Test that TypeScript compiler is invoked correctly
   - Test that output directory is created
   - Test handling of compilation errors

2. **File Processing Tests**:
   - Test reading a specific .puml file
   - Test handling of missing files
   - Test handling of invalid file paths

3. **PlantUML Conversion Tests**:
   - Test converting a simple PlantUML diagram
   - Test handling of invalid PlantUML syntax
   - Test C4 include replacement logic

4. **Command Registration Tests**:
   - Test registering a specific command
   - Test command handler invocation
   - Test handling of missing handlers

### Property-Based Tests

Property-based tests will verify universal properties across all inputs (minimum 100 iterations per test):

1. **Property Test: TypeScript Compilation Completeness**
   - Generate random sets of TypeScript files
   - Run compilation
   - Verify all have corresponding JavaScript output
   - **Feature: fix-vsix-commands, Property 1: TypeScript Compilation Completeness**

2. **Property Test: Command Registration Completeness**
   - Generate random command configurations
   - Activate extension
   - Verify all commands are registered
   - **Feature: fix-vsix-commands, Property 2: Command Registration Completeness**

3. **Property Test: PlantUML File Processing**
   - Generate random .puml file paths
   - Attempt to read each file
   - Verify no read errors for existing files
   - **Feature: fix-vsix-commands, Property 3: PlantUML File Processing**

4. **Property Test: PlantUML to SVG Conversion**
   - Generate random valid PlantUML content
   - Convert to SVG
   - Verify output is valid SVG markup
   - **Feature: fix-vsix-commands, Property 4: PlantUML to SVG Conversion**

5. **Property Test: Output File Generation**
   - Process random sets of .puml files
   - Verify corresponding .svg files exist
   - Verify file paths match expected structure
   - **Feature: fix-vsix-commands, Property 5: Output File Generation**

6. **Property Test: Error Message Display**
   - Generate random error conditions
   - Verify error messages are displayed
   - Verify messages contain useful information
   - **Feature: fix-vsix-commands, Property 6: Error Message Display**

7. **Property Test: Command Handler Execution**
   - Generate random command invocations
   - Verify handlers are called
   - Verify correct handlers are matched to commands
   - **Feature: fix-vsix-commands, Property 7: Command Handler Execution**

### Integration Tests

Integration tests will verify the complete workflow:

1. **Full Build and Install Test**:
   - Run complete build script
   - Verify VSIX is created
   - Install extension
   - Verify all commands are available

2. **End-to-End Diagram Rendering Test**:
   - Create test .puml files
   - Run renderDiagrams command
   - Verify SVG outputs are created
   - Verify SVG content is valid

3. **Extension Activation Test**:
   - Install extension
   - Invoke each command type
   - Verify extension activates correctly
   - Verify commands execute without errors

### Testing Framework

- **Unit Tests**: Jest or Mocha (VSCode extension testing framework)
- **Property-Based Tests**: fast-check (JavaScript property-based testing library)
- **Integration Tests**: VSCode Extension Test Runner

### Test Configuration

All property-based tests must:
- Run minimum 100 iterations
- Use appropriate generators for input data
- Include shrinking for counterexample minimization
- Tag tests with feature name and property number
