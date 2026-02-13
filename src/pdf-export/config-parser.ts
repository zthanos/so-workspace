/**
 * Configuration parser for PDF export
 * Parses manifest.yml and project_information.md files
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import { ManifestConfig, ProjectInfo } from './types';

/**
 * Parse manifest.yml file to extract title and input files
 * @param manifestPath - Absolute path to manifest.yml file
 * @returns ManifestConfig with title and inputs array
 * @throws Error if manifest is missing, malformed, or missing required fields
 */
export function parseManifest(manifestPath: string): ManifestConfig {
  // Check if manifest file exists
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Manifest file not found at: ${manifestPath}\n` +
      `Ensure docs/manifest.yml exists in your workspace.`
    );
  }

  // Read and parse YAML
  let manifestContent: string;
  try {
    manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read manifest file: ${manifestPath}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  let parsedYaml: any;
  try {
    parsedYaml = yaml.load(manifestContent);
  } catch (error) {
    throw new Error(
      `Failed to parse manifest YAML: ${manifestPath}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}\n` +
      `Ensure the file contains valid YAML syntax.`
    );
  }

  // Validate parsed content is an object
  if (!parsedYaml || typeof parsedYaml !== 'object') {
    throw new Error(
      `Invalid manifest format: ${manifestPath}\n` +
      `Expected YAML object with 'title' and 'inputs' fields.`
    );
  }

  // Validate title field exists
  if (!parsedYaml.title || typeof parsedYaml.title !== 'string') {
    throw new Error(
      `Missing or invalid 'title' field in manifest: ${manifestPath}\n` +
      `The manifest must contain a 'title' field with a string value.`
    );
  }

  // Validate inputs field exists and is an array
  if (!parsedYaml.inputs || !Array.isArray(parsedYaml.inputs)) {
    throw new Error(
      `Missing or invalid 'inputs' field in manifest: ${manifestPath}\n` +
      `The manifest must contain an 'inputs' field with an array of file paths.`
    );
  }

  // Validate inputs array is not empty
  if (parsedYaml.inputs.length === 0) {
    throw new Error(
      `Empty 'inputs' array in manifest: ${manifestPath}\n` +
      `The manifest must specify at least one input file.`
    );
  }

  // Validate all inputs are strings
  const invalidInputs = parsedYaml.inputs.filter(
    (input: any) => typeof input !== 'string'
  );
  if (invalidInputs.length > 0) {
    throw new Error(
      `Invalid input entries in manifest: ${manifestPath}\n` +
      `All inputs must be strings (file paths).`
    );
  }

  return {
    title: parsedYaml.title,
    inputs: parsedYaml.inputs
  };
}

/**
 * Parse project_information.md file to extract project metadata
 * @param projectInfoPath - Absolute path to project_information.md file
 * @returns ProjectInfo with all required fields
 * @throws Error if file is missing or required fields are missing
 */
export function parseProjectInfo(projectInfoPath: string): ProjectInfo {
  // Check if project info file exists
  if (!fs.existsSync(projectInfoPath)) {
    throw new Error(
      `Project information file not found at: ${projectInfoPath}\n` +
      `Ensure docs/project_information.md exists in your workspace.`
    );
  }

  // Read file content
  let content: string;
  try {
    content = fs.readFileSync(projectInfoPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read project information file: ${projectInfoPath}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Parse YAML front matter
  // Expected format:
  // ---
  // projectId: "PROJECT-001"
  // projectName: "My Project"
  // author: "John Doe"
  // periodWritten: "Q1 2024"
  // changes: "Initial version"
  // ---

  const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  
  if (!frontMatterMatch) {
    throw new Error(
      `Invalid project information format: ${projectInfoPath}\n` +
      `Expected YAML front matter delimited by '---' at the start of the file.`
    );
  }

  const frontMatterContent = frontMatterMatch[1];
  
  let parsedYaml: any;
  try {
    parsedYaml = yaml.load(frontMatterContent);
  } catch (error) {
    throw new Error(
      `Failed to parse project information YAML: ${projectInfoPath}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}\n` +
      `Ensure the YAML front matter contains valid syntax.`
    );
  }

  // Validate parsed content is an object
  if (!parsedYaml || typeof parsedYaml !== 'object') {
    throw new Error(
      `Invalid project information format: ${projectInfoPath}\n` +
      `Expected YAML object with project metadata fields.`
    );
  }

  // Define required fields
  const requiredFields = [
    'projectId',
    'projectName',
    'author',
    'periodWritten',
    'changes'
  ];

  // Check for missing fields
  const missingFields = requiredFields.filter(
    field => !parsedYaml[field] || typeof parsedYaml[field] !== 'string'
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Missing or invalid required fields in project information: ${projectInfoPath}\n` +
      `Missing fields: ${missingFields.join(', ')}\n` +
      `All fields must be present and contain string values.`
    );
  }

  return {
    projectId: parsedYaml.projectId,
    projectName: parsedYaml.projectName,
    author: parsedYaml.author,
    periodWritten: parsedYaml.periodWritten,
    changes: parsedYaml.changes
  };
}
