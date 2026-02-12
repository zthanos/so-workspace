# Bug Report: Global npm Detection on Windows

## Issue Description

The global npm detection logic in `src/extension.ts` (lines 215-230) does not correctly locate the mermaid-cli executable on Windows.

## Root Cause

The code constructs the path as:
```typescript
const globalMmdc = path.join(globalNodeModules, '.bin', mmcdExecutable);
```

Where `globalNodeModules` is the result of `npm root -g`.

### Expected Behavior (Unix-like systems)
- `npm root -g` returns: `/usr/local/lib/node_modules`
- Global executables are in: `/usr/local/lib/node_modules/.bin/mmdc`
- Detection works correctly ✅

### Actual Behavior (Windows)
- `npm root -g` returns: `C:\Users\<username>\AppData\Roaming\npm\node_modules`
- Global executables are in: `C:\Users\<username>\AppData\Roaming\npm\mmdc.cmd` (parent directory)
- Detection looks in: `C:\Users\<username>\AppData\Roaming\npm\node_modules\.bin\mmdc.cmd` ❌
- File not found at expected location

## Impact

### Severity: LOW
The bug does not break functionality because:
1. The extension falls back to `'mmdc'` if detection fails (line 334)
2. Windows npm adds the global bin directory to PATH automatically
3. The fallback `'mmdc'` resolves correctly via PATH
4. Mermaid diagrams render successfully

### User Experience Impact
- Users see a warning message: "Mermaid CLI (mmdc) not found"
- Warning includes installation instructions (even though mmdc is already installed)
- Users may be confused by the warning when mmdc is actually installed globally
- Extension still functions correctly despite the warning

## Reproduction Steps

1. Install mermaid-cli globally on Windows: `npm install -g @mermaid-js/mermaid-cli`
2. Verify installation: `where.exe mmdc` (shows `C:\Users\<username>\AppData\Roaming\npm\mmdc.cmd`)
3. Install and activate the extension
4. Observe warning message appears despite mmdc being installed

## Verification

```powershell
# Verify npm root -g location
npm root -g
# Output: C:\Users\thano\AppData\Roaming\npm\node_modules

# Verify actual mmdc location
where.exe mmdc
# Output: C:\Users\thano\AppData\Roaming\npm\mmdc.cmd

# Verify detection path (incorrect)
# Extension looks in: C:\Users\thano\AppData\Roaming\npm\node_modules\.bin\mmdc.cmd
# File does not exist at this location

# Verify fallback works
mmdc --version
# Output: 11.12.0 (works via PATH)
```

## Proposed Fix

Update the global npm detection to handle Windows differently:

```typescript
// 3. Check global npm installation
const globalNodeModules = await getGlobalNpmPath();
if (globalNodeModules) {
  let globalMmdc: string;
  
  if (process.platform === 'win32') {
    // On Windows, npm installs executables in the parent directory of node_modules
    const npmBinDir = path.dirname(globalNodeModules);
    globalMmdc = path.join(npmBinDir, mmcdExecutable);
  } else {
    // On Unix-like systems, executables are in node_modules/.bin
    globalMmdc = path.join(globalNodeModules, '.bin', mmcdExecutable);
  }
  
  checkedPaths.push(globalMmdc);
  const result = await checkFileAccessibility(globalMmdc);
  
  if (result.found) {
    return {
      path: globalMmdc,
      source: 'global',
      context: {
        configuredPath,
        checkedPaths,
        platform: process.platform
      }
    };
  }
}
```

## Alternative Fix

Add a fallback check for Windows:

```typescript
// 3. Check global npm installation
const globalNodeModules = await getGlobalNpmPath();
if (globalNodeModules) {
  // Try standard .bin location first
  let globalMmdc = path.join(globalNodeModules, '.bin', mmcdExecutable);
  checkedPaths.push(globalMmdc);
  let result = await checkFileAccessibility(globalMmdc);
  
  // On Windows, also try parent directory if .bin location fails
  if (!result.found && process.platform === 'win32') {
    const npmBinDir = path.dirname(globalNodeModules);
    globalMmdc = path.join(npmBinDir, mmcdExecutable);
    checkedPaths.push(globalMmdc);
    result = await checkFileAccessibility(globalMmdc);
  }
  
  if (result.found) {
    return {
      path: globalMmdc,
      source: 'global',
      context: {
        configuredPath,
        checkedPaths,
        platform: process.platform
      }
    };
  }
}
```

## Testing Recommendations

After implementing the fix:

1. Test on Windows with global mermaid-cli installation
2. Verify no warning message appears
3. Verify mermaid diagrams render correctly
4. Test on macOS/Linux to ensure no regression
5. Test with project-local installation (should still work)
6. Test with custom path configuration (should still work)

## Related Requirements

- **Requirement 8.4**: Global npm path detection
  - Currently: Partially working (fallback via PATH)
  - After fix: Fully working (direct path detection)

## Status

- **Discovered**: During Task 12.3 (Cross-platform compatibility testing)
- **Severity**: LOW (functionality not broken, only warning message issue)
- **Priority**: MEDIUM (improves user experience)
- **Assigned**: Not assigned
- **Target**: Future bug fix task

## Workaround

Users can avoid the warning by:
1. Configuring a custom path in settings: `C:\Users\<username>\AppData\Roaming\npm\mmdc.cmd`
2. Installing mermaid-cli in the project: `npm install --save-dev @mermaid-js/mermaid-cli`
3. Ignoring the warning (extension still works correctly)
