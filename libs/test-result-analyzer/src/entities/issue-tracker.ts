import { z } from 'zod';

/**
 * T028: IssueTracker entity implementation
 *
 * Implements the IssueTracker entity as defined in specs/006-now-we-have/data-model.md
 * This implementation will make the validation tests pass (T017 in issue-tracker.test.ts)
 */

// Validation schemas
const UUIDSchema = z.string().uuid('Must be valid UUID');
const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const StatusSchema = z.enum(['open', 'investigating', 'resolved', 'closed']);

const FailurePatternSchema = z.object({
  pattern: z.string().min(1, 'Pattern cannot be empty'),
  frequency: z.number().positive().int('Frequency must be positive integer'),
  conditions: z.array(z.string()),
  suggestedFixes: z.array(z.string()),
  relatedIssues: z.array(UUIDSchema)
});

const ResolutionSchema = z.object({
  resolvedAt: z.date(),
  resolvedBy: z.string().email('Must be valid email address'),
  solution: z.string().min(1, 'Solution description cannot be empty'),
  verificationSteps: z.array(z.string()).optional(),
  relatedCommits: z.array(z.string()).optional(),
  rootCause: z.string().optional(),
  preventionMeasures: z.array(z.string()).optional()
});

const IssueTrackerSchema = z.object({
  id: UUIDSchema,
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title too long'),
  description: z.string().min(1, 'Description cannot be empty'),
  severity: SeveritySchema,
  status: StatusSchema,
  failurePattern: FailurePatternSchema,
  relatedResults: z.array(UUIDSchema),
  reproducibilityRate: z.number().min(0).max(100).int('Must be integer between 0-100'),
  firstSeen: z.date(),
  lastSeen: z.date(),
  resolution: ResolutionSchema.optional(),
  assignedTo: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().min(1).max(10).default(5),
  estimatedEffort: z.string().optional(),
  businessImpact: z.string().optional()
});

export type Severity = z.infer<typeof SeveritySchema>;
export type Status = z.infer<typeof StatusSchema>;
export type FailurePattern = z.infer<typeof FailurePatternSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;
export type IssueTrackerData = z.infer<typeof IssueTrackerSchema>;

export class IssueTracker {
  private data: IssueTrackerData;

  constructor(input: Partial<IssueTrackerData> & {
    id: string;
    title: string;
    description: string;
    severity: Severity;
    status: Status;
    failurePattern: FailurePattern;
    relatedResults: string[];
    reproducibilityRate: number;
    firstSeen: Date;
    lastSeen: Date;
  }) {
    // Validate reproducibility rate
    if (input.reproducibilityRate < 0 || input.reproducibilityRate > 100 ||
        !Number.isInteger(input.reproducibilityRate)) {
      throw new Error('reproducibilityRate must be integer between 0-100');
    }

    // Validate date relationship
    if (input.firstSeen > input.lastSeen) {
      throw new Error('firstSeen must be before or equal to lastSeen');
    }

    // Validate resolution requirement
    if ((input.status === 'resolved' || input.status === 'closed') && !input.resolution) {
      throw new Error('resolution required when status is resolved or closed');
    }

    // Set defaults
    const issueData = {
      ...input,
      priority: input.priority ?? 5
    };

    // Validate with Zod schema
    const validation = IssueTrackerSchema.safeParse(issueData);
    if (!validation.success) {
      throw new Error(`IssueTracker validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  // Getters for accessing properties
  get id(): string { return this.data.id; }
  get title(): string { return this.data.title; }
  get description(): string { return this.data.description; }
  get severity(): Severity { return this.data.severity; }
  get status(): Status { return this.data.status; }
  get failurePattern(): FailurePattern { return this.data.failurePattern; }
  get relatedResults(): string[] { return this.data.relatedResults; }
  get reproducibilityRate(): number { return this.data.reproducibilityRate; }
  get firstSeen(): Date { return this.data.firstSeen; }
  get lastSeen(): Date { return this.data.lastSeen; }
  get resolution(): Resolution | undefined { return this.data.resolution; }
  get assignedTo(): string | undefined { return this.data.assignedTo; }
  get tags(): string[] | undefined { return this.data.tags; }
  get priority(): number { return this.data.priority; }
  get estimatedEffort(): string | undefined { return this.data.estimatedEffort; }
  get businessImpact(): string | undefined { return this.data.businessImpact; }

  /**
   * Calculate issue age in hours from first seen to last seen
   */
  getAgeInHours(): number {
    const diffMs = this.data.lastSeen.getTime() - this.data.firstSeen.getTime();
    return Math.round(diffMs / (1000 * 60 * 60)); // Convert to hours
  }

  /**
   * Calculate issue age in days from first seen to last seen
   */
  getAgeInDays(): number {
    const ageInHours = this.getAgeInHours();
    return Math.round(ageInHours / 24); // Convert to days
  }

  /**
   * Calculate priority score based on severity and reproducibility
   */
  calculatePriorityScore(): number {
    // Severity weights
    const severityWeights = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };

    // Base score from severity
    let score = severityWeights[this.data.severity] * 25;

    // Add reproducibility impact (0-25 points)
    score += (this.data.reproducibilityRate / 100) * 25;

    // Add frequency impact (0-25 points)
    const frequencyScore = Math.min(25, this.data.failurePattern.frequency * 2);
    score += frequencyScore;

    // Add age impact (0-25 points for issues older than 7 days)
    const ageInDays = this.getAgeInDays();
    if (ageInDays > 7) {
      score += Math.min(25, (ageInDays - 7) * 2);
    }

    return Math.round(Math.min(100, score));
  }

  /**
   * Check if issue is resolved
   */
  isResolved(): boolean {
    return this.data.status === 'resolved' || this.data.status === 'closed';
  }

  /**
   * Check if issue is active (open or investigating)
   */
  isActive(): boolean {
    return this.data.status === 'open' || this.data.status === 'investigating';
  }

  /**
   * Update issue status with validation
   */
  updateStatus(newStatus: Status, resolution?: Resolution): void {
    // Validate status transitions
    const validTransitions: Record<Status, Status[]> = {
      'open': ['investigating', 'resolved', 'closed'],
      'investigating': ['open', 'resolved', 'closed'],
      'resolved': ['closed', 'open'], // Can reopen if verification fails
      'closed': ['open'] // Can reopen if issue recurs
    };

    if (!validTransitions[this.data.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from '${this.data.status}' to '${newStatus}'`);
    }

    // Validate resolution requirement
    if ((newStatus === 'resolved' || newStatus === 'closed') && !resolution) {
      throw new Error('Resolution required when changing status to resolved or closed');
    }

    this.data = {
      ...this.data,
      status: newStatus,
      resolution: resolution || this.data.resolution
    };
  }

  /**
   * Add related test result
   */
  addRelatedResult(resultId: string): void {
    if (!this.data.relatedResults.includes(resultId)) {
      this.data = {
        ...this.data,
        relatedResults: [...this.data.relatedResults, resultId]
      };
    }
  }

  /**
   * Update reproducibility rate based on new occurrences
   */
  updateReproducibilityRate(totalTests: number, failedTests: number): void {
    const newRate = Math.round((failedTests / totalTests) * 100);

    if (newRate < 0 || newRate > 100) {
      throw new Error('Invalid reproducibility rate calculation');
    }

    this.data = {
      ...this.data,
      reproducibilityRate: newRate
    };
  }

  /**
   * Update last seen timestamp
   */
  updateLastSeen(newTimestamp: Date): void {
    if (newTimestamp < this.data.firstSeen) {
      throw new Error('Last seen cannot be before first seen');
    }

    this.data = {
      ...this.data,
      lastSeen: newTimestamp
    };
  }

  /**
   * Get issue urgency level based on multiple factors
   */
  getUrgencyLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const priorityScore = this.calculatePriorityScore();

    if (priorityScore >= 90) return 'critical';
    if (priorityScore >= 70) return 'high';
    if (priorityScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Check if issue affects critical functionality
   */
  affectsCriticalFunctionality(): boolean {
    const criticalPatterns = [
      'authentication',
      'login',
      'payment',
      'security',
      'data-loss'
    ];

    const pattern = this.data.failurePattern.pattern.toLowerCase();
    return criticalPatterns.some(critical => pattern.includes(critical));
  }

  /**
   * Get suggested next actions based on issue state
   */
  getSuggestedNextActions(): string[] {
    const actions: string[] = [];

    if (this.data.status === 'open') {
      actions.push('Assign to developer for investigation');
      if (this.data.reproducibilityRate > 70) {
        actions.push('High reproducibility - prioritize for immediate fix');
      }
    }

    if (this.data.status === 'investigating') {
      actions.push('Provide investigation findings');
      actions.push('Update estimated effort for resolution');
    }

    if (this.data.status === 'resolved') {
      actions.push('Verify fix in testing environment');
      actions.push('Monitor for regression');
    }

    // Add pattern-specific suggestions
    actions.push(...this.data.failurePattern.suggestedFixes);

    // Add severity-specific actions
    if (this.data.severity === 'critical') {
      actions.push('Escalate to senior team members');
      actions.push('Consider hotfix deployment');
    }

    return [...new Set(actions)]; // Remove duplicates
  }

  /**
   * Create impact assessment
   */
  createImpactAssessment(): {
    userImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
    businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
    technicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
    affectedUsers: number;
    estimatedDowntime: string;
  } {
    // Calculate user impact based on reproducibility and pattern
    let userImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (this.data.reproducibilityRate > 80) userImpact = 'high';
    if (this.affectsCriticalFunctionality()) userImpact = 'critical';

    // Business impact correlates with user impact and frequency
    let businessImpact = userImpact;
    if (this.data.failurePattern.frequency > 50) {
      businessImpact = 'critical';
    }

    // Technical impact based on complexity and scope
    let technicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (this.data.failurePattern.relatedIssues.length > 3) {
      technicalImpact = 'high';
    }

    // Estimate affected users (simplified calculation)
    const affectedUsers = Math.round(
      (this.data.reproducibilityRate / 100) * this.data.failurePattern.frequency * 10
    );

    // Estimate downtime
    let estimatedDowntime = 'No downtime';
    if (this.affectsCriticalFunctionality() && this.data.reproducibilityRate > 50) {
      estimatedDowntime = 'Partial service degradation';
    }
    if (this.data.severity === 'critical' && this.data.reproducibilityRate > 90) {
      estimatedDowntime = 'Complete service outage';
    }

    return {
      userImpact,
      businessImpact,
      technicalImpact,
      affectedUsers,
      estimatedDowntime
    };
  }

  /**
   * Generate summary for reporting
   */
  getSummary(): {
    id: string;
    title: string;
    severity: Severity;
    status: Status;
    reproducibilityRate: number;
    ageInDays: number;
    priorityScore: number;
    urgencyLevel: string;
    isResolved: boolean;
  } {
    return {
      id: this.data.id,
      title: this.data.title,
      severity: this.data.severity,
      status: this.data.status,
      reproducibilityRate: this.data.reproducibilityRate,
      ageInDays: this.getAgeInDays(),
      priorityScore: this.calculatePriorityScore(),
      urgencyLevel: this.getUrgencyLevel(),
      isResolved: this.isResolved()
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): IssueTrackerData {
    return {
      ...this.data
    };
  }

  /**
   * Create IssueTracker from JSON
   */
  static fromJSON(json: IssueTrackerData): IssueTracker {
    return new IssueTracker({
      ...json,
      firstSeen: new Date(json.firstSeen),
      lastSeen: new Date(json.lastSeen),
      resolution: json.resolution ? {
        ...json.resolution,
        resolvedAt: new Date(json.resolution.resolvedAt)
      } : undefined
    });
  }
}