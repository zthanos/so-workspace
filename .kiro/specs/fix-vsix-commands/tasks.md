# Implementation Plan: Fix VSIX Commands

## Overview

This implementation plan addresses the VSCode extension command registration issue by ensuring proper build configuration, dependency management, packaging, and installation. The approach focuses on creating a reliable build and deployment pipeline that correctly bundles the plantuml-wasm dependency and registers all extension commands.

## Tasks

- [x] 1. Verify and fix TypeScript build configuration
  - Review tsconfig.json for correct compiler options
  - Ensure output directory is set to "dist/"
  - Verify module system is CommonJS
  - Ensure source maps are enabled
  - _Requirements: 1.1_

- [x] 2. Verify dependency configuration in package.json
  - Ensure plantuml-wasm is in "dependencies" (not "devDependencies")
  - Verify all runtime dependencies are correctly listed
  - Check that build scripts are properly defined
  - _Requirements: 1.2, 1.4_

- [x] 3. Create or update .vscodeignore file
  - Exclude source files (src/, tsconfig.json) from package
  - Include compiled files (dist/) in package
  - Include node_modules for runtime dependencies
  - Exclude development files (.git, .vscode, etc.)
  - _Requirements: 2.2, 2.3_

- [x] 4. Test the build process
  - Run `npm install` to install dependencies
  - Run `npm run compile` to compile TypeScript
  - Verify all .ts files have corresponding .js files in dist/
  - Check for compilation errors
  - _Requirements: 1.1, 1.3_

- [ ]* 4.1 Write property test for TypeScript compilation completeness
  - **Property 1: TypeScript Compilation Completeness**
  - **Validates: Requirements 1.1**

- [x] 5. Test the packaging process
  - Run `npx vsce package` to create VSIX file
  - Verify .vsix file is created
  - Extract and inspect VSIX contents
  - Verify dist/ and node_modules/ are included
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Create build automation script
  - Create PowerShell script for Windows build automation
  - Script should run: npm install, npm run compile, npm run package
  - Script should install the generated VSIX file
  - Script should display success/error messages
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Test extension installation
  - Uninstall any existing version of the extension
  - Install the newly packaged VSIX file using `code --install-extension`
  - Verify extension appears in installed extensions list
  - _Requirements: 3.1, 3.2_

- [x] 8. Verify command registration
  - Open VSCode Command Palette
  - Search for "SO:" commands
  - Verify all commands are listed
  - Test invoking "SO: Diagram Evaluate (Select Diagram)"
  - Test invoking "SO: Render Diagrams (Local)"
  - _Requirements: 3.3, 3.4, 4.1, 4.2_

- [ ]* 8.1 Write property test for command registration completeness
  - **Property 2: Command Registration Completeness**
  - **Validates: Requirements 3.4, 4.3**

- [ ]* 8.2 Write property test for command handler execution
  - **Property 7: Command Handler Execution**
  - **Validates: Requirements 4.4**

- [x] 9. Test plantuml-wasm integration
  - Create a test .puml file in docs/03_architecture/diagrams/src/
  - Run "SO: Render Diagrams (Local)" command
  - Verify SVG output is created in docs/03_architecture/diagrams/out/
  - Verify SVG content is valid
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 9.1 Write property test for PlantUML file processing
  - **Property 3: PlantUML File Processing**
  - **Validates: Requirements 5.2**

- [ ]* 9.2 Write property test for PlantUML to SVG conversion
  - **Property 4: PlantUML to SVG Conversion**
  - **Validates: Requirements 5.3**

- [ ]* 9.3 Write property test for output file generation
  - **Property 5: Output File Generation**
  - **Validates: Requirements 5.4**

- [x] 10. Test error handling
  - Test with invalid .puml file (syntax errors)
  - Test with missing source directory
  - Test with permission errors (read-only output directory)
  - Verify error messages are displayed to user
  - _Requirements: 5.5_

- [ ]* 10.1 Write property test for error message display
  - **Property 6: Error Message Display**
  - **Validates: Requirements 5.5**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Update documentation
  - Update README.md with build instructions
  - Document the "Render Diagrams (Local)" command
  - Add troubleshooting section for common issues
  - Document plantuml-wasm dependency
  - _Requirements: All_

- [ ] 13. Final verification
  - Run complete build script from clean state
  - Install extension in fresh VSCode instance
  - Test all commands end-to-end
  - Verify no "command not found" errors
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The build script should be idempotent (can be run multiple times safely)
- Extension must be reloaded in VSCode after installation (Reload Window command)
