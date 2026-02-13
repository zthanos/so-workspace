/**
 * File validator for PDF export
 * Validates existence of input files and assets
 */

import * as path from 'path';
import * as fs from 'fs';
import { ValidationResult } from './types';

/**
 * Validates that all input files exist
 * 
 * @param workspaceRoot - Absolute path to workspace root
 * @param inputs - Array of input file paths (relative to workspace root)
 * @returns ValidationResult with valid flag and list of missing files
 */
export function validateInputFiles(
  workspaceRoot: string,
  inputs: string[]
): ValidationResult {
  const missingFiles: string[] = [];

  // Check each input file
  for (const inputPath of inputs) {
    // Resolve path relative to workspace root
    const absolutePath = path.resolve(workspaceRoot, inputPath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      missingFiles.push(inputPath);
    }
  }

  return {
    valid: missingFiles.length === 0,
    missingFiles
  };
}

/**
 * Validates that required asset files exist
 * 
 * @param workspaceRoot - Absolute path to workspace root
 * @param logoPath - Path to company logo (relative to workspace root)
 * @returns ValidationResult with valid flag and list of missing files
 */
export function validateAssets(
  workspaceRoot: string,
  logoPath: string
): ValidationResult {
  const missingFiles: string[] = [];

  // Resolve logo path relative to workspace root
  const absoluteLogoPath = path.resolve(workspaceRoot, logoPath);
  
  // Check if logo exists
  if (!fs.existsSync(absoluteLogoPath)) {
    missingFiles.push(logoPath);
  }

  return {
    valid: missingFiles.length === 0,
    missingFiles
  };
}
