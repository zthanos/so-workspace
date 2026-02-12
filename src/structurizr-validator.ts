/**
 * Structurizr Server Validator
 * 
 * Validates Structurizr DSL files against a Structurizr server API.
 * Supports both Structurizr Lite (local) and Structurizr Cloud instances.
 * 
 * The validator sends DSL content to the server's validation endpoint
 * and parses the response to extract errors and warnings with line numbers.
 * 
 * Requirements:
 * - Structurizr server must be running and accessible
 * - Default server URL is http://localhost:8080 (Structurizr Lite)
 * - Can be configured to use Structurizr Cloud or custom instances
 * 
 * Features:
 * - Validates individual .dsl files
 * - Validates multiple .dsl files in batch
 * - Extracts line numbers and error messages
 * - Handles server unavailable gracefully
 * - Provides actionable error messages
 */

import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import { URL } from "url";

// ============================================================================
// Interface Definitions
// ============================================================================

/**
 * Result from validating a single DSL file
 */
export interface ValidationResult {
  /** Path to the DSL file that was validated */
  filePath: string;
  
  /** Whether the DSL file is valid */
  valid: boolean;
  
  /** List of validation errors */
  errors: ValidationError[];
  
  /** List of validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error with location information
 */
export interface ValidationError {
  /** Line number where the error occurs */
  line: number;
  
  /** Optional column number */
  column?: number;
  
  /** Error message describing the issue */
  message: string;
  
  /** Severity level */
  severity: 'error' | 'warning';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Line number where the warning occurs */
  line: number;
  
  /** Warning message */
  message: string;
}

/**
 * Response from Structurizr validation API
 * This is the expected format from the server
 */
interface StructurizrValidationResponse {
  /** Whether validation succeeded */
  success: boolean;
  
  /** List of errors (if any) */
  errors?: Array<{
    line?: number;
    column?: number;
    message: string;
  }>;
  
  /** List of warnings (if any) */
  warnings?: Array<{
    line?: number;
    message: string;
  }>;
  
  /** Optional error message for server-level errors */
  message?: string;
}

// ============================================================================
// Structurizr Validator Implementation
// ============================================================================

/**
 * Validator for Structurizr DSL files
 * Uses Structurizr server API to validate DSL syntax and semantics
 */
export class StructurizrValidator {
  /** Default timeout for HTTP requests (30 seconds) */
  private static readonly DEFAULT_TIMEOUT = 30000;
  
  /** Validation API endpoint path */
  private static readonly VALIDATION_ENDPOINT = '/api/workspace/validate';

  /**
   * Validate a single Structurizr DSL file
   * 
   * @param dslPath - Path to the .dsl file to validate
   * @param serverUrl - Structurizr server URL (defaults to http://localhost:8080)
   * @returns Promise<ValidationResult> - Validation result with errors and warnings
   * @throws Error if file cannot be read or server communication fails critically
   */
  async validate(
    dslPath: string,
    serverUrl: string = 'http://localhost:8080'
  ): Promise<ValidationResult> {
    // Read DSL file content
    let dslContent: string;
    try {
      dslContent = await fs.promises.readFile(dslPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read DSL file: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Send validation request to server
    let response: StructurizrValidationResponse;
    try {
      response = await this.sendValidationRequest(dslContent, serverUrl);
    } catch (error) {
      // Handle server unavailable gracefully
      return {
        filePath: dslPath,
        valid: false,
        errors: [
          {
            line: 0,
            message: `Structurizr server unavailable: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }

    // Parse validation response
    return this.parseValidationResponse(dslPath, response);
  }

  /**
   * Validate multiple Structurizr DSL files
   * 
   * @param dslPaths - Array of paths to .dsl files to validate
   * @param serverUrl - Structurizr server URL (defaults to http://localhost:8080)
   * @returns Promise<ValidationResult[]> - Array of validation results, one per file
   */
  async validateAll(
    dslPaths: string[],
    serverUrl: string = 'http://localhost:8080'
  ): Promise<ValidationResult[]> {
    // Validate each file independently
    const results: ValidationResult[] = [];
    
    for (const dslPath of dslPaths) {
      try {
        const result = await this.validate(dslPath, serverUrl);
        results.push(result);
      } catch (error) {
        // If validation fails critically, add an error result
        results.push({
          filePath: dslPath,
          valid: false,
          errors: [
            {
              line: 0,
              message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
              severity: 'error',
            },
          ],
          warnings: [],
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // Private Helper Methods - HTTP Communication
  // ==========================================================================

  /**
   * Send validation request to Structurizr server
   * Makes HTTP POST to {serverUrl}/api/workspace/validate
   * 
   * @param dslContent - DSL content to validate
   * @param serverUrl - Structurizr server URL
   * @returns Promise<StructurizrValidationResponse> - Parsed validation response
   * @throws Error if server is unreachable or returns invalid response
   */
  private async sendValidationRequest(
    dslContent: string,
    serverUrl: string
  ): Promise<StructurizrValidationResponse> {
    return new Promise<StructurizrValidationResponse>((resolve, reject) => {
      // Parse server URL
      const url = new URL(StructurizrValidator.VALIDATION_ENDPOINT, serverUrl);
      const client = url.protocol === 'https:' ? https : http;

      // Prepare request options
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(dslContent, 'utf-8'),
        },
        timeout: StructurizrValidator.DEFAULT_TIMEOUT,
      };

      // Make HTTP request
      const req = client.request(url.href, options, (res) => {
        let data = '';

        // Collect response data
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          // Check response status
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            // Special handling for 405 Method Not Allowed - validation endpoint not supported
            if (res.statusCode === 405) {
              reject(
                new Error(
                  `Validation endpoint not supported by this Structurizr server. ` +
                  `The server at ${serverUrl} does not support the /api/workspace/validate endpoint. ` +
                  `This is expected for Structurizr Lite. Consider using the render command instead, ` +
                  `which will validate during rendering.`
                )
              );
              return;
            }
            
            reject(
              new Error(
                `Server returned status ${res.statusCode}: ${data || res.statusMessage}`
              )
            );
            return;
          }

          // Parse JSON response
          try {
            const response = JSON.parse(data) as StructurizrValidationResponse;
            resolve(response);
          } catch (error) {
            reject(
              new Error(
                `Invalid JSON response from server: ${error instanceof Error ? error.message : String(error)}`
              )
            );
          }
        });
      });

      // Handle request errors
      req.on('error', (error) => {
        reject(
          new Error(
            `Failed to connect to Structurizr server at ${serverUrl}: ${error.message}\n` +
            'Ensure Structurizr Lite is running or configure the correct server URL.'
          )
        );
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout - server did not respond in time'));
      });

      // Write request body
      req.write(dslContent, 'utf-8');
      req.end();
    });
  }

  // ==========================================================================
  // Private Helper Methods - Response Parsing
  // ==========================================================================

  /**
   * Parse validation response from Structurizr server
   * Extracts errors and warnings with line numbers
   * 
   * @param dslPath - Path to the DSL file (for result object)
   * @param response - Validation response from server
   * @returns ValidationResult - Parsed validation result
   */
  private parseValidationResponse(
    dslPath: string,
    response: StructurizrValidationResponse
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Parse errors
    if (response.errors && Array.isArray(response.errors)) {
      for (const error of response.errors) {
        errors.push({
          line: error.line || 0,
          column: error.column,
          message: error.message || 'Unknown error',
          severity: 'error',
        });
      }
    }

    // Parse warnings
    if (response.warnings && Array.isArray(response.warnings)) {
      for (const warning of response.warnings) {
        warnings.push({
          line: warning.line || 0,
          message: warning.message || 'Unknown warning',
        });
      }
    }

    // Check for server-level error message
    if (!response.success && response.message && errors.length === 0) {
      errors.push({
        line: 0,
        message: response.message,
        severity: 'error',
      });
    }

    // Determine if validation succeeded
    const valid = response.success && errors.length === 0;

    return {
      filePath: dslPath,
      valid,
      errors,
      warnings,
    };
  }
}
