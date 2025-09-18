import { z } from 'zod';

/**
 * T024: TestSuite entity implementation
 *
 * Implements the TestSuite entity as defined in specs/006-now-we-have/data-model.md
 * This implementation will make the validation tests pass (T013 in test-suite.test.ts)
 */

// Validation schemas
const TestSuiteStatusSchema = z.enum(['draft', 'active', 'archived']);
const SemVerSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be valid semantic version (x.y.z)');
const UUIDSchema = z.string().uuid('Must be valid UUID');

const TestStepSchema = z.object({
  id: z.string().min(1, 'Step ID cannot be empty'),
  action: z.enum(['navigate', 'click', 'fill', 'wait', 'assert']),
  target: z.string().min(1, 'Target cannot be empty'),
  value: z.string().optional(),
  timeout: z.number().positive().optional(),
  description: z.string().optional()
});

const ExpectedOutcomeSchema = z.object({
  finalUrl: z.string().optional(),
  authenticationState: z.enum(['authenticated', 'unauthenticated']).optional(),
  redirectCount: z.number().min(0).optional(),
  maxDuration: z.number().positive().optional(),
  requiredElements: z.array(z.string()).optional(),
  forbiddenElements: z.array(z.string()).optional()
});

const TestScenarioSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1, 'Scenario name cannot be empty').max(200, 'Scenario name too long'),
  description: z.string().optional(),
  userRole: z.enum(['admin', 'hr_admin', 'manager', 'employee', 'guest']),
  preconditions: z.array(z.string()).optional(),
  steps: z.array(TestStepSchema).min(1, 'Must contain at least 1 step'),
  expectedOutcome: ExpectedOutcomeSchema,
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  estimatedDuration: z.number().positive().optional(),
  browsers: z.array(z.enum(['chromium', 'firefox', 'webkit'])).optional()
});

const TestSuiteSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1, 'Test suite name cannot be empty').max(100, 'Test suite name too long'),
  description: z.string().optional(),
  version: SemVerSchema,
  status: TestSuiteStatusSchema,
  scenarios: z.array(TestScenarioSchema).min(1, 'Must contain at least 1 scenario'),
  browsers: z.array(z.enum(['chromium', 'firefox', 'webkit'])).default(['chromium']),
  baseUrl: z.string().url('Must be valid URL'),
  configuration: z.object({
    maxIterations: z.number().positive().default(10),
    retryFailedTests: z.boolean().default(true),
    delayBetweenIterations: z.number().min(0).default(1000),
    stopOnConsecutiveFailures: z.number().positive().optional(),
    timeout: z.number().positive().default(30000)
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().email('Must be valid email address'),
  tags: z.array(z.string()).optional()
});

export type TestSuiteStatus = z.infer<typeof TestSuiteStatusSchema>;
export type TestStep = z.infer<typeof TestStepSchema>;
export type TestScenario = z.infer<typeof TestScenarioSchema>;
export type TestSuiteData = z.infer<typeof TestSuiteSchema>;

export class TestSuite {
  private data: TestSuiteData;

  constructor(input: Partial<TestSuiteData> & {
    id: string;
    name: string;
    version: string;
    scenarios: TestScenario[];
    baseUrl: string;
    createdBy: string;
  }) {
    // Set defaults and validate input
    const now = new Date();
    const testSuiteData = {
      ...input,
      status: input.status || 'draft' as TestSuiteStatus,
      browsers: input.browsers || ['chromium'],
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
      configuration: {
        maxIterations: 10,
        retryFailedTests: true,
        delayBetweenIterations: 1000,
        timeout: 30000,
        ...input.configuration
      }
    };

    // Validate scenario name uniqueness
    const scenarioNames = testSuiteData.scenarios.map(s => s.name);
    const uniqueNames = new Set(scenarioNames);
    if (scenarioNames.length !== uniqueNames.size) {
      throw new Error('Scenario names must be unique within a test suite');
    }

    // Validate with Zod schema
    const validation = TestSuiteSchema.safeParse(testSuiteData);
    if (!validation.success) {
      throw new Error(`TestSuite validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  // Getters for accessing properties
  get id(): string { return this.data.id; }
  get name(): string { return this.data.name; }
  get description(): string | undefined { return this.data.description; }
  get version(): string { return this.data.version; }
  get status(): TestSuiteStatus { return this.data.status; }
  get scenarios(): TestScenario[] { return this.data.scenarios; }
  get browsers(): string[] { return this.data.browsers; }
  get baseUrl(): string { return this.data.baseUrl; }
  get configuration(): any { return this.data.configuration; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }
  get createdBy(): string { return this.data.createdBy; }
  get tags(): string[] | undefined { return this.data.tags; }

  /**
   * Update test suite metadata (name, description, tags)
   */
  updateMetadata(updates: {
    name?: string;
    description?: string;
    tags?: string[];
  }): void {
    const updatedData = {
      ...this.data,
      ...updates,
      updatedAt: new Date()
    };

    const validation = TestSuiteSchema.safeParse(updatedData);
    if (!validation.success) {
      throw new Error(`TestSuite update validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  /**
   * Add a new scenario to the test suite
   */
  addScenario(scenario: TestScenario): void {
    // Check for name uniqueness
    if (this.data.scenarios.some(s => s.name === scenario.name)) {
      throw new Error(`Scenario with name '${scenario.name}' already exists`);
    }

    const updatedData = {
      ...this.data,
      scenarios: [...this.data.scenarios, scenario],
      updatedAt: new Date()
    };

    const validation = TestSuiteSchema.safeParse(updatedData);
    if (!validation.success) {
      throw new Error(`TestSuite scenario addition validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  /**
   * Remove a scenario by ID
   */
  removeScenario(scenarioId: string): void {
    const updatedScenarios = this.data.scenarios.filter(s => s.id !== scenarioId);

    if (updatedScenarios.length === this.data.scenarios.length) {
      throw new Error(`Scenario with ID '${scenarioId}' not found`);
    }

    if (updatedScenarios.length === 0) {
      throw new Error('Cannot remove last scenario - test suite must contain at least 1 scenario');
    }

    this.data = {
      ...this.data,
      scenarios: updatedScenarios,
      updatedAt: new Date()
    };
  }

  /**
   * Transition test suite status with validation
   */
  transitionStatus(newStatus: TestSuiteStatus): void {
    const currentStatus = this.data.status;

    // Validate status transitions
    const validTransitions: Record<TestSuiteStatus, TestSuiteStatus[]> = {
      'draft': ['active', 'archived'],
      'active': ['archived'],
      'archived': [] // No transitions from archived
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
    }

    this.data = {
      ...this.data,
      status: newStatus,
      updatedAt: new Date()
    };
  }

  /**
   * Calculate total estimated execution time for all scenarios
   */
  calculateTotalEstimatedTime(): number {
    return this.data.scenarios.reduce((total, scenario) => {
      const scenarioTime = scenario.estimatedDuration || 0;
      const browsers = scenario.browsers || this.data.browsers;
      return total + (scenarioTime * browsers.length);
    }, 0);
  }

  /**
   * Get scenarios by priority level
   */
  getScenariosByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): TestScenario[] {
    return this.data.scenarios.filter(scenario => scenario.priority === priority);
  }

  /**
   * Get scenarios by user role
   */
  getScenariosByUserRole(userRole: 'admin' | 'hr_admin' | 'manager' | 'employee' | 'guest'): TestScenario[] {
    return this.data.scenarios.filter(scenario => scenario.userRole === userRole);
  }

  /**
   * Validate test suite is ready for execution
   */
  isReadyForExecution(): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.data.status !== 'active') {
      issues.push('Test suite must be in active status for execution');
    }

    if (this.data.scenarios.length === 0) {
      issues.push('Test suite must contain at least one scenario');
    }

    // Validate all scenarios have required steps
    this.data.scenarios.forEach(scenario => {
      if (scenario.steps.length === 0) {
        issues.push(`Scenario '${scenario.name}' has no steps`);
      }
    });

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * Create a copy of the test suite with a new version
   */
  createNewVersion(newVersion: string): TestSuite {
    // Validate semantic versioning
    if (!SemVerSchema.safeParse(newVersion).success) {
      throw new Error('New version must be valid semantic version (x.y.z)');
    }

    return new TestSuite({
      ...this.data,
      id: crypto.randomUUID(),
      version: newVersion,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Serialize to JSON
   */
  toJSON(): TestSuiteData {
    return {
      ...this.data
    };
  }

  /**
   * Create TestSuite from JSON
   */
  static fromJSON(json: TestSuiteData): TestSuite {
    return new TestSuite({
      ...json,
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt)
    });
  }
}