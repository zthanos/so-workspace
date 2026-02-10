/**
 * Kroki Backend Renderer
 * 
 * Implements diagram rendering using the Kroki cloud service:
 * - Supports Mermaid, PlantUML, and Structurizr diagrams
 * - Uses HTTP API for rendering
 * - Includes rate limiting for concurrent requests
 * 
 * This backend enables diagram rendering without local dependencies,
 * requiring only internet connectivity to the Kroki service.
 */

import * as https from "https";
import * as http from "http";
import * as zlib from "zlib";
import { promisify } from "util";
import {
  RenderBackend,
  BackendAvailability,
  RenderOutput,
  DiagramType,
} from "./backend-strategy";
import { DiagramFile } from "./diagram_renderer_v2";

const deflateAsync = promisify(zlib.deflate);

// ============================================================================
// Configuration Interface
// ============================================================================

/**
 * Configuration for Kroki backend renderer
 */
export interface KrokiBackendConfig {
  /** Kroki service URL (defaults to https://kroki.io) */
  krokiUrl?: string;

  /** Maximum concurrent API requests */
  maxConcurrent?: number;

  /** Request timeout in milliseconds (defaults to 30000) */
  timeout?: number;
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Simple rate limiter for controlling concurrent operations
 */
class RateLimiter {
  private queue: Array<() => void> = [];
  private activeCount = 0;

  constructor(private maxConcurrent: number) {}

  /**
   * Acquire a slot for execution
   * Returns a promise that resolves when a slot is available
   */
  async acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release a slot after execution completes
   */
  release(): void {
    this.activeCount--;
    const next = this.queue.shift();
    if (next) {
      this.activeCount++;
      next();
    }
  }
}

// ============================================================================
// Kroki Backend Implementation
// ============================================================================

/**
 * Kroki cloud service rendering backend
 * Supports all diagram types through HTTP API
 */
export class KrokiRenderBackend implements RenderBackend {
  readonly name = "Kroki";

  private krokiUrl: string;
  private timeout: number;
  private rateLimiter: RateLimiter;

  constructor(config: KrokiBackendConfig = {}) {
    this.krokiUrl = config.krokiUrl || "https://kroki.io";
    this.timeout = config.timeout || 30000;
    this.rateLimiter = new RateLimiter(config.maxConcurrent || 5);
  }

  /**
   * Check if backend is available and ready to use
   * Validates Kroki service reachability
   */
  async isAvailable(): Promise<BackendAvailability> {
    try {
      // Try to reach Kroki service with a simple health check
      await this.checkServiceReachability();

      return {
        available: true,
        supportedTypes: ["mermaid", "plantuml", "structurizr"],
      };
    } catch (error) {
      return {
        available: false,
        message: `Kroki service is unreachable: ${error instanceof Error ? error.message : String(error)}`,
        supportedTypes: [],
      };
    }
  }

  /**
   * Render a diagram file to SVG
   */
  async render(file: DiagramFile, content: string): Promise<RenderOutput> {
    // Acquire rate limiter slot
    await this.rateLimiter.acquire();

    try {
      // Map diagram type to Kroki type
      const krokiType = this.mapDiagramType(file.type);

      // Encode content for Kroki API
      const encoded = await this.encodeContent(content);

      // Make HTTP request to Kroki API
      const svg = await this.makeKrokiRequest(krokiType, encoded);

      return {
        content: svg,
        format: "svg",
        extension: ".svg",
      };
    } finally {
      // Release rate limiter slot
      this.rateLimiter.release();
    }
  }

  /**
   * Cleanup resources (no-op for Kroki backend)
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for Kroki backend
  }

  // ==========================================================================
  // Private Helper Methods - Service Availability
  // ==========================================================================

  /**
   * Check if Kroki service is reachable
   * Makes a simple GET request to the service root
   */
  private async checkServiceReachability(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = new URL(this.krokiUrl);
      const client = url.protocol === "https:" ? https : http;

      const req = client.get(url.href, { timeout: this.timeout }, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
        } else {
          reject(new Error(`Service returned status code: ${res.statusCode}`));
        }
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
    });
  }

  // ==========================================================================
  // Private Helper Methods - Content Encoding
  // ==========================================================================

  /**
   * Encode content for Kroki API
   * Compresses with zlib and base64 encodes with URL-safe characters
   */
  private async encodeContent(content: string): Promise<string> {
    // Compress content using zlib (deflate)
    const compressed = await deflateAsync(Buffer.from(content, "utf-8"));

    // Base64 encode
    const base64 = compressed.toString("base64");

    // Make URL-safe by replacing characters
    const urlSafe = base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return urlSafe;
  }

  // ==========================================================================
  // Private Helper Methods - HTTP Client
  // ==========================================================================

  /**
   * Map internal diagram type to Kroki diagram type
   */
  private mapDiagramType(type: DiagramType): string {
    // Direct mapping for now
    return type;
  }

  /**
   * Make HTTP request to Kroki API
   * POST to https://kroki.io/{diagram-type}/svg with encoded content
   */
  private async makeKrokiRequest(
    diagramType: string,
    encodedContent: string
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const url = new URL(`${this.krokiUrl}/${diagramType}/svg`);
      const client = url.protocol === "https:" ? https : http;

      const postData = JSON.stringify({
        diagram_source: encodedContent,
      });

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: this.timeout,
      };

      const req = client.request(url.href, options, (res) => {
        let data = "";

        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            // Follow redirect
            this.makeKrokiRequest(diagramType, encodedContent)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        // Handle error responses
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            reject(
              new Error(
                `Kroki API error (${res.statusCode}): ${data || res.statusMessage}`
              )
            );
          });
          return;
        }

        // Collect response data
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve(data);
        });
      });

      req.on("error", (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      // Write request body
      req.write(postData);
      req.end();
    });
  }
}
