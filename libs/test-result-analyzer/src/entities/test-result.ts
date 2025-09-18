import { z } from 'zod';

/**
 * T026: TestResult entity implementation
 *
 * Implements the TestResult entity as defined in specs/006-now-we-have/data-model.md
 * This implementation will make the validation tests pass (T015 in test-result.test.ts)
 */

// Validation schemas
const UUIDSchema = z.string().uuid('Must be valid UUID');
const TestStatusSchema = z.enum(['passed', 'failed', 'skipped', 'timeout']);
const BrowserSchema = z.enum(['chromium', 'firefox', 'webkit']);

const LogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  source: z.string(),
  metadata: z.record(z.any()).optional()
});

const PerformanceMetricsSchema = z.object({
  pageLoadTime: z.number().min(0),
  authenticationTime: z.number().min(0).optional(),
  redirectTime: z.number().min(0).optional(),
  totalExecutionTime: z.number().min(0),
  memoryUsage: z.number().min(0).optional(),
  networkRequests: z.number().min(0).optional(),
  domNodes: z.number().min(0).optional(),
  renderTime: z.number().min(0).optional()
});

const EnvironmentDataSchema = z.object({
  os: z.string(),
  browserVersion: z.string(),
  viewportSize: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }),
  userAgent: z.string(),
  timestamp: z.string().datetime(),
  baseUrl: z.string().url(),
  backendVersion: z.string().optional(),
  nodeVersion: z.string().optional(),
  testEnvironment: z.string().optional()
});

const FailureDetailsSchema = z.object({
  stepId: UUIDSchema,
  errorMessage: z.string(),
  stackTrace: z.string(),
  errorType: z.string(),
  actualValue: z.any().optional(),
  expectedValue: z.any().optional(),
  retryCount: z.number().min(0),
  browserLogs: z.array(z.string()).optional(),
  networkLogs: z.array(z.object({
    url: z.string(),
    method: z.string(),
    status: z.number(),
    duration: z.number().min(0),
    requestHeaders: z.record(z.string()).optional(),
    responseHeaders: z.record(z.string()).optional(),
    timestamp: z.string().datetime()
  })).optional(),
  domSnapshot: z.string().optional(),
  screenshot: z.string().optional(),
  videoPath: z.string().optional()
});

const TestResultSchema = z.object({
  id: UUIDSchema,
  testSuiteId: UUIDSchema,
  scenarioId: UUIDSchema,
  executionId: UUIDSchema,
  status: TestStatusSchema,
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number().positive(),
  browser: BrowserSchema,
  environment: EnvironmentDataSchema,
  screenshots: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  logs: z.array(LogEntrySchema).optional(),
  performanceMetrics: PerformanceMetricsSchema.optional(),
  failureDetails: FailureDetailsSchema.optional(),
  metadata: z.record(z.any()).optional()
});

export type TestStatus = z.infer<typeof TestStatusSchema>;
export type Browser = z.infer<typeof BrowserSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export type EnvironmentData = z.infer<typeof EnvironmentDataSchema>;
export type FailureDetails = z.infer<typeof FailureDetailsSchema>;
export type TestResultData = z.infer<typeof TestResultSchema>;

export class TestResult {
  private data: TestResultData;

  constructor(input: Partial<TestResultData> & {
    id: string;
    testSuiteId: string;
    scenarioId: string;
    executionId: string;
    status: TestStatus;
    startTime: Date;
    endTime: Date;
    duration: number;
    browser: Browser;
    environment: EnvironmentData;
  }) {
    // Validate basic constraints
    if (input.startTime >= input.endTime) {
      throw new Error('startTime must be before endTime');
    }

    if (input.duration <= 0) {
      throw new Error('Duration must be positive integer');
    }

    // Validate failure details requirement
    if (input.status === 'failed' && !input.failureDetails) {
      throw new Error('failureDetails required when status is failed');
    }

    // Validate file paths
    if (input.screenshots) {
      input.screenshots.forEach(path => {
        if (!path || path.trim() === '') {
          throw new Error('Screenshot paths cannot be empty');
        }
      });
    }

    if (input.videos) {
      input.videos.forEach(path => {
        if (!path || path.trim() === '' || !path.match(/\.(webm|mp4|avi)$/i)) {
          throw new Error('Video paths must be valid video files');
        }
      });
    }

    // Validate with Zod schema
    const validation = TestResultSchema.safeParse({
      ...input,
      startTime: input.startTime,
      endTime: input.endTime
    });

    if (!validation.success) {
      throw new Error(`TestResult validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  // Getters for accessing properties
  get id(): string { return this.data.id; }
  get testSuiteId(): string { return this.data.testSuiteId; }
  get scenarioId(): string { return this.data.scenarioId; }
  get executionId(): string { return this.data.executionId; }
  get status(): TestStatus { return this.data.status; }
  get startTime(): Date { return this.data.startTime; }
  get endTime(): Date { return this.data.endTime; }
  get duration(): number { return this.data.duration; }
  get browser(): Browser { return this.data.browser; }
  get environment(): EnvironmentData { return this.data.environment; }
  get screenshots(): string[] | undefined { return this.data.screenshots; }
  get videos(): string[] | undefined { return this.data.videos; }
  get logs(): LogEntry[] | undefined { return this.data.logs; }
  get performanceMetrics(): PerformanceMetrics | undefined { return this.data.performanceMetrics; }
  get failureDetails(): FailureDetails | undefined { return this.data.failureDetails; }
  get metadata(): Record<string, any> | undefined { return this.data.metadata; }

  /**
   * Calculate actual duration from start and end times
   */
  calculateActualDuration(): number {
    return this.data.endTime.getTime() - this.data.startTime.getTime();
  }

  /**
   * Check if test result indicates performance issues
   */
  hasPerformanceIssues(): boolean {
    if (!this.data.performanceMetrics) {
      return false;
    }

    const metrics = this.data.performanceMetrics;

    // Define performance thresholds
    const thresholds = {
      pageLoadTime: 5000,      // 5 seconds
      authenticationTime: 3000, // 3 seconds
      totalExecutionTime: 10000, // 10 seconds
      memoryUsage: 90.0,       // 90% memory usage
      networkRequests: 30      // Too many requests
    };

    // Check for performance issues
    if (metrics.pageLoadTime > thresholds.pageLoadTime) return true;
    if (metrics.authenticationTime && metrics.authenticationTime > thresholds.authenticationTime) return true;
    if (metrics.totalExecutionTime > thresholds.totalExecutionTime) return true;
    if (metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage) return true;
    if (metrics.networkRequests && metrics.networkRequests > thresholds.networkRequests) return true;

    return false;
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    if (!this.data.performanceMetrics) {
      return 50; // Neutral score when no metrics available
    }

    const metrics = this.data.performanceMetrics;
    let score = 100;

    // Deduct points for slow performance
    if (metrics.pageLoadTime > 2000) {
      score -= Math.min(30, (metrics.pageLoadTime - 2000) / 100);
    }

    if (metrics.authenticationTime && metrics.authenticationTime > 1000) {
      score -= Math.min(20, (metrics.authenticationTime - 1000) / 100);
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 70) {
      score -= Math.min(25, (metrics.memoryUsage - 70) * 2);
    }

    if (metrics.networkRequests && metrics.networkRequests > 10) {
      score -= Math.min(15, (metrics.networkRequests - 10) * 2);
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Check if result is a timeout failure
   */
  isTimeout(): boolean {
    return this.data.status === 'timeout';
  }

  /**
   * Check if result is a test failure (not timeout or skip)
   */
  isFailure(): boolean {
    return this.data.status === 'failed';
  }

  /**
   * Check if result is successful
   */
  isSuccess(): boolean {
    return this.data.status === 'passed';
  }

  /**
   * Get error classification if failed
   */
  getErrorClassification(): string | null {
    if (!this.data.failureDetails) {
      return null;
    }

    const errorMessage = this.data.failureDetails.errorMessage.toLowerCase();
    const errorType = this.data.failureDetails.errorType.toLowerCase();

    // Classify common error types
    if (errorType.includes('timeout') || errorMessage.includes('timeout')) {
      return 'timeout';
    }
    if (errorType.includes('element') || errorMessage.includes('element not found')) {
      return 'element_not_found';
    }
    if (errorType.includes('network') || errorMessage.includes('network')) {
      return 'network_error';
    }
    if (errorType.includes('authentication') || errorMessage.includes('auth')) {
      return 'authentication_error';
    }
    if (errorType.includes('navigation') || errorMessage.includes('navigation')) {
      return 'navigation_error';
    }

    return 'unknown_error';
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    if (!this.data.logs) {
      return [];
    }
    return this.data.logs.filter(log => log.level === level);
  }

  /**
   * Get error logs
   */
  getErrorLogs(): LogEntry[] {
    return this.getLogsByLevel('error');
  }

  /**
   * Check if result has screenshots available
   */
  hasScreenshots(): boolean {
    return !!(this.data.screenshots && this.data.screenshots.length > 0);
  }

  /**
   * Check if result has video recording available
   */
  hasVideos(): boolean {
    return !!(this.data.videos && this.data.videos.length > 0);
  }

  /**
   * Get summary of the test result
   */
  getSummary(): {
    id: string;
    status: TestStatus;
    browser: Browser;
    duration: number;
    hasFailure: boolean;
    hasPerformanceIssues: boolean;
    errorType?: string;
  } {
    return {
      id: this.data.id,
      status: this.data.status,
      browser: this.data.browser,
      duration: this.data.duration,
      hasFailure: this.isFailure(),
      hasPerformanceIssues: this.hasPerformanceIssues(),
      errorType: this.getErrorClassification() || undefined
    };
  }

  /**
   * Compare with another test result for analysis
   */
  compareWith(otherResult: TestResult): {
    sameScenario: boolean;
    sameBrowser: boolean;
    durationDelta: number;
    statusChanged: boolean;
    performanceChanged: boolean;
  } {
    return {
      sameScenario: this.data.scenarioId === otherResult.scenarioId,
      sameBrowser: this.data.browser === otherResult.browser,
      durationDelta: this.data.duration - otherResult.duration,
      statusChanged: this.data.status !== otherResult.status,
      performanceChanged: this.hasPerformanceIssues() !== otherResult.hasPerformanceIssues()
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): TestResultData {
    return {
      ...this.data
    };
  }

  /**
   * Create TestResult from JSON
   */
  static fromJSON(json: TestResultData): TestResult {
    return new TestResult({
      ...json,
      startTime: new Date(json.startTime),
      endTime: new Date(json.endTime)
    });
  }
}