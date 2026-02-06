# Requirements Document: Fix VSIX Commands

## Introduction

The SO Workspace VSCode extension provides commands for managing solution outline documentation workflows. After adding a new "Render Diagrams (Local)" command that uses plantuml-wasm for JavaScript-based PlantUML rendering, the extension commands are not being recognized by VSCode, resulting in "command not found" errors. This feature will ensure the extension is properly built, packaged, and installed so all commands work correctly.

## Glossary

- **VSIX**: Visual Studio Code Extension package format
- **Extension**: The SO Workspace VSCode extension
- **Command**: A VSCode command registered by the extension
- **plantuml-wasm**: A WebAssembly-based PlantUML renderer for JavaScript
- **Package**: The process of creating a .vsix file from extension source code
- **Activation**: The process of VSCode loading and initializing an extension

## Requirements

### Requirement 1: Extension Build and Compilation

**User Story:** As a developer, I want the extension to be properly compiled with all dependencies, so that all TypeScript code is transpiled and ready for execution.

#### Acceptance Criteria

1. WHEN the extension is built, THE Build_System SHALL compile all TypeScript files to JavaScript in the dist folder
2. WHEN the extension is built, THE Build_System SHALL include all node_modules dependencies in the package
3. WHEN the extension is built, THE Build_System SHALL copy required script files to the dist folder
4. WHEN plantuml-wasm is imported, THE Build_System SHALL bundle it correctly for VSCode runtime

### Requirement 2: Extension Packaging

**User Story:** As a developer, I want to package the extension into a VSIX file, so that it can be installed in VSCode.

#### Acceptance Criteria

1. WHEN packaging the extension, THE Package_System SHALL create a valid .vsix file
2. WHEN packaging the extension, THE Package_System SHALL include the compiled dist folder
3. WHEN packaging the extension, THE Package_System SHALL include all dependencies from node_modules
4. WHEN packaging the extension, THE Package_System SHALL validate the package.json manifest

### Requirement 3: Extension Installation

**User Story:** As a user, I want to install the updated extension, so that all commands become available in VSCode.

#### Acceptance Criteria

1. WHEN installing the extension, THE Installation_System SHALL uninstall any previous version
2. WHEN installing the extension, THE Installation_System SHALL install the new VSIX package
3. WHEN the extension is installed, THE Extension SHALL activate on command invocation
4. WHEN the extension is activated, THE Extension SHALL register all declared commands

### Requirement 4: Command Registration Verification

**User Story:** As a user, I want all extension commands to be available, so that I can execute them from the Command Palette.

#### Acceptance Criteria

1. WHEN the extension is activated, THE Extension SHALL register the "so-workspace.diagram.eval" command
2. WHEN the extension is activated, THE Extension SHALL register the "so-workspace.renderDiagrams" command
3. WHEN the extension is activated, THE Extension SHALL register all other declared commands
4. WHEN a command is invoked, THE Extension SHALL execute the corresponding handler function

### Requirement 5: PlantUML-WASM Integration

**User Story:** As a user, I want to render PlantUML diagrams locally using JavaScript, so that I don't need Docker or Java dependencies.

#### Acceptance Criteria

1. WHEN the renderDiagrams command is executed, THE Extension SHALL load the plantuml-wasm module
2. WHEN processing a .puml file, THE Extension SHALL read the file content
3. WHEN generating output, THE Extension SHALL use plantuml-wasm to convert PlantUML to SVG
4. WHEN rendering completes, THE Extension SHALL save SVG files to the output directory
5. WHEN an error occurs, THE Extension SHALL display a meaningful error message

### Requirement 6: Build Automation

**User Story:** As a developer, I want automated build scripts, so that I can easily rebuild and reinstall the extension during development.

#### Acceptance Criteria

1. WHEN running the build script, THE Build_Script SHALL execute npm install
2. WHEN running the build script, THE Build_Script SHALL execute npm run compile
3. WHEN running the build script, THE Build_Script SHALL execute npm run package
4. WHEN running the build script, THE Build_Script SHALL install the generated VSIX file
5. WHEN the build completes, THE Build_Script SHALL display success or error messages
