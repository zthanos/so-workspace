# Mermaid CLI Installation and Detection

## Overview

The extension requires `@mermaid-js/mermaid-cli` to be installed separately by the user. The extension implements an intelligent detection system that automatically locates mermaid-cli installations on the user's system, eliminating the need for manual path configuration in most cases.

## Why Separate Installation?

Mermaid CLI cannot be bundled with the extension because:
1. It's a command-line tool that must run as a separate process
2. It includes Puppeteer with Chromium binaries (200MB+)
3. Bundling it would create a 1GB+ VSIX package that times out during packaging
4. The new approach reduces the VSIX package to under 10MB while maintaining full functionality

## Detection System

The extension automatically detects mermaid-cli installations using a three-tier detection strategy:

### Detection Order

1. **Custom Configured Path** (highest priority)
   - If you configure a custom path in settings (other than default "mmdc")
   - The extension validates the path exists and is accessible
   - Returns immediately if valid, shows error if invalid

2. **Project-Local Installation**
   - Checks `<workspace>/node_modules/.bin/mmdc` (or `.cmd` on Windows)
   - Useful for project-specific mermaid-cli versions
   - Ensures consistent rendering across team members

3. **Global npm Installation** (lowest priority)
   - Executes `npm root -g` to find global node_modules
   - Checks `<global-node-modules>/.bin/mmdc`
   - Works with standard npm global installations

### Platform-Specific Handling

The detection system handles platform differences automatically:

- **Windows**: Looks for `mmdc.cmd` (batch file wrapper)
- **macOS/Linux**: Looks for `mmdc` (shell script)
- **Path separators**: Uses platform-appropriate separators (`\` on Windows, `/` on Unix)

## Installation Options

### Global Installation (Recommended)

Install mermaid-cli globally to use it across all projects:

```bash
npm install -g @mermaid-js/mermaid-cli
```

**Benefits:**
- Available to all projects and workspaces
- Single installation and maintenance
- Extension auto-detects without configuration

**Verification:**
```bash
# Check installation
npm list -g @mermaid-js/mermaid-cli

# Test executable
mmdc --version
```

### Project-Local Installation

Install mermaid-cli in your project's node_modules:

```bash
npm install --save-dev @mermaid-js/mermaid-cli
```

**Benefits:**
- Version control per project
- Team members get same version via package.json
- No global environment changes needed

**Verification:**
```bash
# Check installation
npm list @mermaid-js/mermaid-cli

# Test executable (from project root)
npx mmdc --version
```

### Custom Path Configuration

If you have mermaid-cli installed in a non-standard location:

1. Open VS Code Settings (File → Preferences → Settings)
2. Search for "SO Workspace Diagrams"
3. Set "Mermaid CLI Path" to your custom path
4. Examples:
   - Windows: `C:\tools\mermaid-cli\mmdc.cmd`
   - macOS/Linux: `/opt/mermaid-cli/mmdc`

## Configuration

### Default Configuration

```json
{
  "so-workspace.diagrams.java.mermaidCliPath": "mmdc"
}
```

The default value `"mmdc"` enables automatic detection. The extension will search all three locations (custom, project, global) in priority order.

### Custom Path Configuration

```json
{
  "so-workspace.diagrams.java.mermaidCliPath": "/usr/local/bin/mmdc"
}
```

Setting a custom path (other than "mmdc") bypasses auto-detection and uses the specified path directly.

## Error Handling

### Mermaid CLI Not Found

If the extension cannot find mermaid-cli in any location, you'll see:

```
Error: Mermaid CLI (mmdc) not found

The extension requires @mermaid-js/mermaid-cli to be installed separately.

Install globally:
  npm install -g @mermaid-js/mermaid-cli

Or install in your project:
  npm install --save-dev @mermaid-js/mermaid-cli

For more help, see: [documentation link]
```

### Invalid Custom Path

If you configure a custom path that doesn't exist or isn't accessible:

```
Error: Configured Mermaid CLI path is invalid

The configured path does not exist or is not executable:
  /custom/path/to/mmdc

Please check your configuration or reset to default "mmdc" for auto-detection.
```

### Permission Issues

If mermaid-cli is found but not executable (Unix systems):

```
Error: Mermaid CLI found but not executable

The mmdc executable was found but cannot be executed:
  /usr/local/bin/mmdc

Check file permissions:
  chmod +x /usr/local/bin/mmdc
```

## Technical Implementation

### Detection Algorithm

```typescript
interface MermaidCLIResolution {
  path: string | null;
  source: 'custom' | 'project' | 'global' | 'not-found';
  error?: string;
}

function resolveMermaidCLIPath(
  configuredPath: string,
  workspaceRoot: string,
  extensionPath: string
): MermaidCLIResolution
```

### File Accessibility Validation

The detection system validates each potential path:
1. Checks if file exists
2. Verifies file is readable
3. Verifies file is executable (Unix only)
4. Returns detailed error information if validation fails

### Global npm Path Detection

Uses `npm root -g` to reliably find the global node_modules directory across all platforms and npm configurations.

## Migration from Previous Version

### What Changed

**Before (Bundled Approach):**
- Mermaid CLI was bundled with the extension
- No separate installation required
- VSIX package was 1GB+ and timed out during packaging

**After (Separate Installation):**
- Mermaid CLI must be installed separately
- Extension auto-detects installations
- VSIX package is under 10MB
- Packaging completes successfully

### Migration Steps

1. **Install mermaid-cli** (if not already installed):
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```

2. **Verify installation**:
   ```bash
   mmdc --version
   ```

3. **Reload VS Code** to ensure the extension detects the installation

4. **Test rendering** by opening a Mermaid diagram file

5. **No configuration changes needed** - the default "mmdc" setting enables auto-detection

### Troubleshooting Migration

If you encounter issues after upgrading:

1. Check if mermaid-cli is installed: `npm list -g @mermaid-js/mermaid-cli`
2. Install if missing: `npm install -g @mermaid-js/mermaid-cli`
3. Reload VS Code: Command Palette → "Developer: Reload Window"
4. Check Output panel (View → Output → SO Workspace) for detailed errors
5. Verify detection order matches your installation type

## Benefits of the New Approach

1. **Smaller Package Size**: VSIX reduced from 1GB+ to under 10MB
2. **Faster Installation**: Extension installs quickly without large binaries
3. **User Control**: Users can choose their preferred mermaid-cli version
4. **No Packaging Timeouts**: Extension packages successfully every time
5. **Flexible Configuration**: Supports global, project-local, and custom installations
6. **Automatic Detection**: Works without manual configuration in most cases
7. **Clear Error Messages**: Provides specific installation instructions when needed

## Future Considerations

### Potential Improvements
1. Add automatic mermaid-cli installation prompt on first use
2. Add version compatibility checking
3. Add update notifications for outdated mermaid-cli versions
4. Support alternative Mermaid rendering backends

### Maintenance
- Keep detection logic updated with npm changes
- Test across different platforms and npm configurations
- Document any platform-specific issues or workarounds
