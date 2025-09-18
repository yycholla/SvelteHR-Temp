import { z } from 'zod';

/**
 * T027: FailureDetails entity implementation
 *
 * Implements the FailureDetails entity as defined in specs/006-now-we-have/data-model.md
 * This implementation will make the validation tests pass (T016 in failure-details.test.ts)
 */

// Validation schemas
const UUIDSchema = z.string().uuid('Must be valid UUID');

const NetworkLogSchema = z.object({
  url: z.string().url('Must be valid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']),
  status: z.number().min(0).max(999),
  duration: z.number().min(0),
  requestHeaders: z.record(z.string()).optional(),
  responseHeaders: z.record(z.string()).optional(),
  timestamp: z.string().datetime()
});

const FailureDetailsSchema = z.object({
  stepId: UUIDSchema,
  errorMessage: z.string().min(1, 'Error message cannot be empty'),
  stackTrace: z.string().min(1, 'Stack trace cannot be empty'),
  errorType: z.string().min(1, 'Error type cannot be empty'),
  actualValue: z.any().optional(),
  expectedValue: z.any().optional(),
  retryCount: z.number().min(0).int('Retry count must be non-negative integer'),
  browserLogs: z.array(z.string()).optional(),
  networkLogs: z.array(NetworkLogSchema).optional(),
  domSnapshot: z.string().optional(),
  screenshot: z.string().optional(),
  videoPath: z.string().optional(),
  contextData: z.record(z.any()).optional(),
  relatedFailures: z.array(UUIDSchema).optional()
});

export type NetworkLog = z.infer<typeof NetworkLogSchema>;
export type FailureDetailsData = z.infer<typeof FailureDetailsSchema>;

export class FailureDetails {
  private data: FailureDetailsData;

  constructor(input: Partial<FailureDetailsData> & {
    stepId: string;
    errorMessage: string;
    stackTrace: string;
    errorType: string;
    retryCount: number;
  }) {
    // Validate retry count
    if (input.retryCount < 0 || !Number.isInteger(input.retryCount)) {
      throw new Error('retryCount must be non-negative integer');
    }

    // Validate browser logs
    if (input.browserLogs) {
      input.browserLogs.forEach(log => {
        if (typeof log !== 'string') {
          throw new Error('browserLogs must be array of strings');
        }
      });
    }

    // Validate network logs structure
    if (input.networkLogs) {
      input.networkLogs.forEach(log => {
        const validation = NetworkLogSchema.safeParse(log);
        if (!validation.success) {
          throw new Error(`Invalid network log structure: ${validation.error.message}`);
        }
      });
    }

    // Validate with Zod schema
    const validation = FailureDetailsSchema.safeParse(input);
    if (!validation.success) {
      throw new Error(`FailureDetails validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  // Getters for accessing properties
  get stepId(): string { return this.data.stepId; }
  get errorMessage(): string { return this.data.errorMessage; }
  get stackTrace(): string { return this.data.stackTrace; }
  get errorType(): string { return this.data.errorType; }
  get actualValue(): any { return this.data.actualValue; }
  get expectedValue(): any { return this.data.expectedValue; }
  get retryCount(): number { return this.data.retryCount; }
  get browserLogs(): string[] | undefined { return this.data.browserLogs; }
  get networkLogs(): NetworkLog[] | undefined { return this.data.networkLogs; }
  get domSnapshot(): string | undefined { return this.data.domSnapshot; }
  get screenshot(): string | undefined { return this.data.screenshot; }
  get videoPath(): string | undefined { return this.data.videoPath; }
  get contextData(): Record<string, any> | undefined { return this.data.contextData; }
  get relatedFailures(): string[] | undefined { return this.data.relatedFailures; }

  /**
   * Check if this is a timeout error
   */
  isTimeoutError(): boolean {
    const errorType = this.data.errorType.toLowerCase();
    const errorMessage = this.data.errorMessage.toLowerCase();

    return errorType.includes('timeout') ||
           errorMessage.includes('timeout') ||
           errorType === 'Timeout';
  }

  /**
   * Check if this is an element not found error
   */
  isElementNotFoundError(): boolean {
    const errorType = this.data.errorType.toLowerCase();
    const errorMessage = this.data.errorMessage.toLowerCase();

    return errorType.includes('elementnotfound') ||
           errorMessage.includes('element not found') ||
           errorType === 'ElementNotFound';
  }

  /**
   * Check if this is a network error
   */
  isNetworkError(): boolean {
    const errorType = this.data.errorType.toLowerCase();
    const errorMessage = this.data.errorMessage.toLowerCase();

    return errorType.includes('network') ||
           errorMessage.includes('network') ||
           (this.data.networkLogs && this.data.networkLogs.some(log => log.status === 0));
  }

  /**
   * Check if this is an authentication error
   */
  isAuthenticationError(): boolean {
    const errorType = this.data.errorType.toLowerCase();
    const errorMessage = this.data.errorMessage.toLowerCase();

    return errorType.includes('authentication') ||
           errorMessage.includes('authentication') ||
           errorMessage.includes('credentials') ||
           errorType === 'AuthenticationError';
  }

  /**
   * Extract meaningful error context for analysis
   */
  extractErrorContext(): {
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestedFixes: string[];
    rootCause: string;
    impact: string;
  } {
    let category = 'unknown';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    const suggestedFixes: string[] = [];
    let rootCause = 'Unknown error';
    let impact = 'Test execution failed';

    // Categorize error
    if (this.isTimeoutError()) {
      category = 'timeout';
      severity = 'medium';
      suggestedFixes.push('Increase timeout values', 'Check server performance', 'Optimize network conditions');
      rootCause = 'Operation exceeded allowed time limit';
      impact = 'Test execution delayed or failed';
    } else if (this.isElementNotFoundError()) {
      category = 'ui_element';
      severity = 'high';
      suggestedFixes.push('Verify element selector', 'Check page loading timing', 'Update element locators');
      rootCause = 'UI element not available when expected';
      impact = 'Cannot interact with user interface';
    } else if (this.isNetworkError()) {
      category = 'network';
      severity = 'high';
      suggestedFixes.push('Check network connectivity', 'Verify server availability', 'Review firewall settings');
      rootCause = 'Network communication failure';
      impact = 'Cannot communicate with server';
    } else if (this.isAuthenticationError()) {
      category = 'authentication';
      severity = 'high';
      suggestedFixes.push('Check credentials', 'Verify user permissions', 'Review authentication flow');
      rootCause = 'Authentication or authorization failure';
      impact = 'Cannot access secured resources';
    }

    // Adjust severity based on retry count
    if (this.data.retryCount > 3) {
      severity = 'critical';
      suggestedFixes.push('Investigate persistent failure cause');
    }

    return {
      category,
      severity,
      suggestedFixes,
      rootCause,
      impact
    };
  }

  /**
   * Determine if failure is likely flaky based on context
   */
  isLikelyFlaky(): boolean {
    // High retry count suggests flakiness
    if (this.data.retryCount > 2) {
      return true;
    }

    // Network timeouts are often flaky
    if (this.isNetworkError() || this.isTimeoutError()) {
      return true;
    }

    // Check for timing-related issues in logs
    if (this.data.browserLogs) {
      const timingIssues = this.data.browserLogs.some(log =>
        log.includes('timing') ||
        log.includes('race condition') ||
        log.includes('async')
      );
      if (timingIssues) return true;
    }

    // Network issues with status 0 (no response) are often flaky
    if (this.data.networkLogs) {
      const networkFailures = this.data.networkLogs.some(log =>
        log.status === 0 || log.duration > 30000
      );
      if (networkFailures) return true;
    }

    // Element not found with very quick failure might be timing issue
    if (this.isElementNotFoundError() && this.data.retryCount === 0) {
      return false; // Likely consistent issue
    }

    return false;
  }

  /**
   * Generate debugging recommendations based on failure details
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const context = this.extractErrorContext();

    // Add context-specific recommendations
    recommendations.push(...context.suggestedFixes);

    // Add specific recommendations based on available data
    if (this.data.domSnapshot) {
      recommendations.push('Analyze DOM snapshot for element availability');
    }

    if (this.data.screenshot) {
      recommendations.push('Review screenshot for visual issues');
    }

    if (this.data.networkLogs && this.data.networkLogs.length > 0) {
      recommendations.push('Review network logs for failed requests');
    }

    if (this.data.browserLogs && this.data.browserLogs.length > 0) {
      recommendations.push('Check browser console logs for errors');
    }

    // Element-specific recommendations
    if (this.isElementNotFoundError()) {
      recommendations.push(
        'Check for overlapping elements',
        'Verify element visibility',
        'Wait for element to load'
      );

      if (this.data.domSnapshot?.includes('overlay')) {
        recommendations.push('Wait for overlay to disappear');
      }
    }

    // Timeout-specific recommendations
    if (this.isTimeoutError()) {
      recommendations.push(
        'Increase timeout configuration',
        'Check server response times',
        'Optimize page loading performance'
      );
    }

    // Network-specific recommendations
    if (this.isNetworkError()) {
      recommendations.push(
        'Verify server is running',
        'Check network connectivity',
        'Review API endpoint availability'
      );
    }

    // Remove duplicates and return
    return [...new Set(recommendations)];
  }

  /**
   * Get failure fingerprint for pattern matching
   */
  getFingerprint(): string {
    const components = [
      this.data.errorType,
      this.data.errorMessage.replace(/\d+/g, 'NUM'), // Replace numbers with placeholder
      this.isLikelyFlaky() ? 'FLAKY' : 'CONSISTENT'
    ];

    return components.join('|');
  }

  /**
   * Get severity score (0-100)
   */
  getSeverityScore(): number {
    const context = this.extractErrorContext();
    const severityScores = {
      'low': 25,
      'medium': 50,
      'high': 75,
      'critical': 100
    };

    let score = severityScores[context.severity];

    // Adjust based on retry count
    score += Math.min(20, this.data.retryCount * 5);

    // Adjust based on error type
    if (this.isAuthenticationError()) {
      score += 10; // Security implications
    }

    return Math.min(100, score);
  }

  /**
   * Check if failure has debugging artifacts available
   */
  hasDebuggingArtifacts(): {
    hasScreenshot: boolean;
    hasVideo: boolean;
    hasDOMSnapshot: boolean;
    hasNetworkLogs: boolean;
    hasBrowserLogs: boolean;
    completeness: number;
  } {
    const artifacts = {
      hasScreenshot: !!this.data.screenshot,
      hasVideo: !!this.data.videoPath,
      hasDOMSnapshot: !!this.data.domSnapshot,
      hasNetworkLogs: !!(this.data.networkLogs && this.data.networkLogs.length > 0),
      hasBrowserLogs: !!(this.data.browserLogs && this.data.browserLogs.length > 0)
    };

    const availableCount = Object.values(artifacts).filter(Boolean).length;
    const completeness = (availableCount / 5) * 100;

    return {
      ...artifacts,
      completeness
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): FailureDetailsData {
    return {
      ...this.data
    };
  }

  /**
   * Create FailureDetails from JSON
   */
  static fromJSON(json: FailureDetailsData): FailureDetails {
    return new FailureDetails(json);
  }
}