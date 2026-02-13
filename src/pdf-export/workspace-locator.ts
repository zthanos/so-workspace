import * as path from 'path';
import * as fs from 'fs';

/**
 * Finds the workspace root by searching for docs/manifest.yml
 * 
 * @param startDir - The directory to start searching from
 * @returns The absolute path to the workspace root
 * @throws Error if workspace root cannot be found within 8 levels
 */
export function findWorkspaceRoot(startDir: string): string {
  let currentDir = path.resolve(startDir);
  
  // Search up to 8 levels up the directory tree
  for (let i = 0; i < 8; i++) {
    const manifestPath = path.join(currentDir, 'docs', 'manifest.yml');
    
    if (fs.existsSync(manifestPath)) {
      return currentDir;
    }
    
    const parentDir = path.dirname(currentDir);
    
    // Check if we've reached the root of the filesystem
    if (parentDir === currentDir) {
      break;
    }
    
    currentDir = parentDir;
  }
  
  throw new Error(
    'Cannot locate workspace root (expected docs/manifest.yml). ' +
    'Ensure you\'re running from within the project.'
  );
}
