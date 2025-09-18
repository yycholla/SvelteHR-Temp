import { z } from 'zod';

/**
 * T025: TestScenario entity implementation
 *
 * Implements the TestScenario entity as defined in specs/006-now-we-have/data-model.md
 * This implementation will make the validation tests pass (T014 in test-scenario.test.ts)
 */

// Validation schemas
const UUIDSchema = z.string().uuid('Must be valid UUID');
const UserRoleSchema = z.enum(['admin', 'hr_admin', 'manager', 'employee', 'guest']);
const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const BrowserSchema = z.enum(['chromium', 'firefox', 'webkit']);
const ActionSchema = z.enum(['navigate', 'click', 'fill', 'wait', 'assert', 'hover', 'select', 'upload', 'scroll']);

const TestStepSchema = z.object({
  id: z.string().min(1, 'Step ID cannot be empty'),
  action: ActionSchema,
  target: z.string().min(1, 'Target cannot be empty'),
  value: z.string().optional(),
  timeout: z.number().positive().optional(),
  description: z.string().optional(),
  waitCondition: z.string().optional(),
  retryCount: z.number().min(0).optional()
});

const ExpectedOutcomeSchema = z.object({
  finalUrl: z.string().optional(),
  authenticationState: z.enum(['authenticated', 'unauthenticated']).optional(),
  redirectCount: z.number().min(0).optional(),
  maxDuration: z.number().positive().optional(),
  requiredElements: z.array(z.string()).optional(),
  forbiddenElements: z.array(z.string()).optional(),
  expectedText: z.array(z.string()).optional(),
  statusCode: z.number().optional(),
  cookies: z.array(z.string()).optional(),
  localStorage: z.record(z.string()).optional()
});

const TestScenarioSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1, 'Scenario name cannot be empty').max(200, 'Scenario name too long'),
  description: z.string().optional(),
  userRole: UserRoleSchema,
  preconditions: z.array(z.string()).optional(),
  steps: z.array(TestStepSchema).min(1, 'Must contain at least 1 step'),
  expectedOutcome: ExpectedOutcomeSchema,
  tags: z.array(z.string()).optional(),
  priority: PrioritySchema,
  estimatedDuration: z.number().positive().optional(),
  browsers: z.array(BrowserSchema).optional(),
  retryOnFailure: z.boolean().default(false),
  maxRetries: z.number().min(0).default(0),
  dependsOn: z.array(UUIDSchema).optional()
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Browser = z.infer<typeof BrowserSchema>;
export type TestStep = z.infer<typeof TestStepSchema>;
export type ExpectedOutcome = z.infer<typeof ExpectedOutcomeSchema>;
export type TestScenarioData = z.infer<typeof TestScenarioSchema>;

export class TestScenario {
  private data: TestScenarioData;

  constructor(input: Partial<TestScenarioData> & {
    id: string;
    name: string;
    userRole: UserRole;
    steps: TestStep[];
    expectedOutcome: ExpectedOutcome;
    priority: Priority;
  }) {
    // Set defaults
    const scenarioData = {
      ...input,
      retryOnFailure: input.retryOnFailure ?? false,
      maxRetries: input.maxRetries ?? 0
    };

    // Validate step actions are supported
    scenarioData.steps.forEach(step => {
      if (!ActionSchema.safeParse(step.action).success) {
        throw new Error(`Invalid action '${step.action}' in step '${step.id}'`);
      }
    });

    // Validate browser subset if provided
    if (scenarioData.browsers) {
      const allowedBrowsers = ['chromium', 'firefox', 'webkit'];
      const invalidBrowsers = scenarioData.browsers.filter(b => !allowedBrowsers.includes(b));
      if (invalidBrowsers.length > 0) {
        throw new Error(`Invalid browsers: ${invalidBrowsers.join(', ')}. Must be subset of ${allowedBrowsers.join(', ')}`);
      }
    }

    // Validate with Zod schema
    const validation = TestScenarioSchema.safeParse(scenarioData);
    if (!validation.success) {
      throw new Error(`TestScenario validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  // Getters for accessing properties
  get id(): string { return this.data.id; }
  get name(): string { return this.data.name; }
  get description(): string | undefined { return this.data.description; }
  get userRole(): UserRole { return this.data.userRole; }
  get preconditions(): string[] | undefined { return this.data.preconditions; }
  get steps(): TestStep[] { return this.data.steps; }
  get expectedOutcome(): ExpectedOutcome { return this.data.expectedOutcome; }
  get tags(): string[] | undefined { return this.data.tags; }
  get priority(): Priority { return this.data.priority; }
  get estimatedDuration(): number | undefined { return this.data.estimatedDuration; }
  get browsers(): Browser[] | undefined { return this.data.browsers; }
  get retryOnFailure(): boolean { return this.data.retryOnFailure; }
  get maxRetries(): number { return this.data.maxRetries; }
  get dependsOn(): string[] | undefined { return this.data.dependsOn; }

  /**
   * Calculate total timeout for all steps in the scenario
   */
  calculateTotalTimeout(): number {
    return this.data.steps.reduce((total, step) => {
      return total + (step.timeout || 0);
    }, 0);
  }

  /**
   * Add a new step to the scenario
   */
  addStep(step: TestStep): void {
    // Validate the step action
    if (!ActionSchema.safeParse(step.action).success) {
      throw new Error(`Invalid action '${step.action}' in step '${step.id}'`);
    }

    // Check for step ID uniqueness
    if (this.data.steps.some(s => s.id === step.id)) {
      throw new Error(`Step with ID '${step.id}' already exists`);
    }

    const updatedData = {
      ...this.data,
      steps: [...this.data.steps, step]
    };

    const validation = TestScenarioSchema.safeParse(updatedData);
    if (!validation.success) {
      throw new Error(`TestScenario step addition validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  /**
   * Remove a step by ID
   */
  removeStep(stepId: string): void {
    const updatedSteps = this.data.steps.filter(s => s.id !== stepId);

    if (updatedSteps.length === this.data.steps.length) {
      throw new Error(`Step with ID '${stepId}' not found`);
    }

    if (updatedSteps.length === 0) {
      throw new Error('Cannot remove last step - scenario must contain at least 1 step');
    }

    this.data = {
      ...this.data,
      steps: updatedSteps
    };
  }

  /**
   * Update step by ID
   */
  updateStep(stepId: string, updates: Partial<TestStep>): void {
    const stepIndex = this.data.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step with ID '${stepId}' not found`);
    }

    const updatedStep = {
      ...this.data.steps[stepIndex],
      ...updates,
      id: stepId // Ensure ID cannot be changed
    };

    // Validate the updated step
    if (updates.action && !ActionSchema.safeParse(updates.action).success) {
      throw new Error(`Invalid action '${updates.action}' in step '${stepId}'`);
    }

    const updatedSteps = [...this.data.steps];
    updatedSteps[stepIndex] = updatedStep;

    const updatedData = {
      ...this.data,
      steps: updatedSteps
    };

    const validation = TestScenarioSchema.safeParse(updatedData);
    if (!validation.success) {
      throw new Error(`TestScenario step update validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  /**
   * Get steps by action type
   */
  getStepsByAction(action: string): TestStep[] {
    return this.data.steps.filter(step => step.action === action);
  }

  /**
   * Validate scenario is complete and ready for execution
   */
  isReadyForExecution(): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.data.steps.length === 0) {
      issues.push('Scenario must contain at least one step');
    }

    // Check for required step types for authentication scenarios
    if (this.data.userRole !== 'guest') {
      const hasNavigation = this.data.steps.some(s => s.action === 'navigate');
      if (!hasNavigation) {
        issues.push('Authentication scenarios should include navigation step');
      }
    }

    // Validate step targets are not empty
    this.data.steps.forEach(step => {
      if (!step.target || step.target.trim() === '') {
        issues.push(`Step '${step.id}' has empty target`);
      }
    });

    // Validate expected outcome has meaningful criteria
    const outcome = this.data.expectedOutcome;
    if (!outcome.finalUrl && !outcome.authenticationState &&
        !outcome.requiredElements && !outcome.expectedText) {
      issues.push('Expected outcome should specify at least one validation criteria');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * Get scenario complexity score based on steps and conditions
   */
  getComplexityScore(): number {
    let score = 0;

    // Base score from number of steps
    score += this.data.steps.length;

    // Add complexity for different action types
    const actionTypes = new Set(this.data.steps.map(s => s.action));
    score += actionTypes.size * 2;

    // Add complexity for preconditions
    if (this.data.preconditions) {
      score += this.data.preconditions.length;
    }

    // Add complexity for expected outcome criteria
    const outcome = this.data.expectedOutcome;
    if (outcome.requiredElements) score += outcome.requiredElements.length;
    if (outcome.forbiddenElements) score += outcome.forbiddenElements.length;
    if (outcome.expectedText) score += outcome.expectedText.length;

    // Add complexity for dependencies
    if (this.data.dependsOn) {
      score += this.data.dependsOn.length * 3;
    }

    return score;
  }

  /**
   * Check if scenario can run in parallel with another scenario
   */
  canRunInParallelWith(otherScenario: TestScenario): boolean {
    // Same user role scenarios might interfere with each other
    if (this.data.userRole === otherScenario.userRole &&
        this.data.userRole !== 'guest') {
      return false;
    }

    // Check for dependencies
    if (this.data.dependsOn?.includes(otherScenario.id) ||
        otherScenario.dependsOn?.includes(this.data.id)) {
      return false;
    }

    // Check for conflicting browser requirements
    if (this.data.browsers && otherScenario.browsers) {
      const commonBrowsers = this.data.browsers.filter(b =>
        otherScenario.browsers!.includes(b)
      );
      if (commonBrowsers.length === 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a copy of the scenario with modifications
   */
  clone(overrides: Partial<TestScenarioData> = {}): TestScenario {
    const newId = overrides.id || crypto.randomUUID();
    const newName = overrides.name || `${this.data.name} (Copy)`;

    return new TestScenario({
      ...this.data,
      ...overrides,
      id: newId,
      name: newName
    });
  }

  /**
   * Serialize to JSON
   */
  toJSON(): TestScenarioData {
    return {
      ...this.data
    };
  }

  /**
   * Create TestScenario from JSON
   */
  static fromJSON(json: TestScenarioData): TestScenario {
    return new TestScenario(json);
  }
}