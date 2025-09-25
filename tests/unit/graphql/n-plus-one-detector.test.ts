/**
 * N+1 Query Detector Tests
 *
 * Tests for N+1 query pattern detection and DataLoader optimization suggestions.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { parse, buildSchema } from 'graphql';
import {
  NPlusOneDetector,
  createPostGraphileNPlusOneDetector
} from '$lib/graphql/n-plus-one-detector';

// Extended test schema for N+1 detection
const testSchema = buildSchema(`
  type Query {
    users(first: Int): UserConnection!
    departments: [Department!]!
    employees(filter: EmployeeFilter): [Employee!]!
    reports: [Report!]!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    department: Department!
    managedEmployees: [Employee!]!
    performanceReviews: [PerformanceReview!]!
    documents: [Document!]!
  }

  type Employee {
    id: ID!
    user: User!
    department: Department!
    manager: Employee
    directReports: [Employee!]!
    performanceReviews: [PerformanceReview!]!
    leaveRequests: [LeaveRequest!]!
    skills: [Skill!]!
  }

  type Department {
    id: ID!
    name: String!
    employees: [Employee!]!
    manager: Employee
    budgetReports: [Report!]!
  }

  type PerformanceReview {
    id: ID!
    employee: Employee!
    reviewer: Employee!
    goals: [Goal!]!
    comments: [Comment!]!
  }

  type Goal {
    id: ID!
    title: String!
    employee: Employee!
    milestones: [Milestone!]!
  }

  type Milestone {
    id: ID!
    goal: Goal!
    tasks: [Task!]!
  }

  type Task {
    id: ID!
    milestone: Milestone!
    assignee: Employee!
    dependencies: [Task!]!
  }

  type LeaveRequest {
    id: ID!
    employee: Employee!
    approver: Employee
    documents: [Document!]!
  }

  type Document {
    id: ID!
    owner: User!
    approvals: [Approval!]!
  }

  type Approval {
    id: ID!
    document: Document!
    approver: Employee!
  }

  type Comment {
    id: ID!
    author: Employee!
    replies: [Comment!]!
  }

  type Report {
    id: ID!
    department: Department!
    metrics: [Metric!]!
  }

  type Metric {
    id: ID!
    report: Report!
    relatedEmployees: [Employee!]!
  }

  type Skill {
    id: ID!
    employees: [Employee!]!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  input EmployeeFilter {
    departmentId: ID
    managerId: ID
  }
`);

describe('NPlusOneDetector', () => {
  let detector: NPlusOneDetector;

  beforeEach(() => {
    detector = new NPlusOneDetector({}, testSchema);
  });

  describe('Basic N+1 Detection', () => {
    test('should detect simple N+1 pattern in list query', () => {
      const query = parse(`
        query NPlusOneQuery {
          employees {
            id
            name
            department {
              id
              name
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(query);

      expect(optimization.patterns.length).toBeGreaterThan(0);

      const departmentPattern = optimization.patterns.find(p =>
        p.fieldPath.includes('department')
      );

      expect(departmentPattern).toBeDefined();
      expect(departmentPattern?.severity).toBeOneOf(['medium', 'high', 'critical']);
    });

    test('should detect nested N+1 patterns', () => {
      const query = parse(`
        query DeepNPlusOne {
          departments {
            id
            name
            employees {
              id
              name
              performanceReviews {
                id
                goals {
                  id
                  milestones {
                    id
                    tasks {
                      id
                      assignee {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(query);

      expect(optimization.patterns.length).toBeGreaterThan(2);

      // Should detect multiple levels of N+1
      const criticalPatterns = optimization.patterns.filter(p => p.severity === 'critical');
      expect(criticalPatterns.length).toBeGreaterThan(0);

      // Should have high estimated call count
      const highCallCountPattern = optimization.patterns.find(p =>
        p.estimatedCallCount > 100
      );
      expect(highCallCountPattern).toBeDefined();
    });

    test('should not flag simple non-N+1 queries', () => {
      const simpleQuery = parse(`
        query SimpleQuery {
          users(first: 10) {
            edges {
              node {
                id
                name
                email
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(simpleQuery);

      // Simple queries without nested relationships should have no or low-severity patterns
      const highSeverityPatterns = optimization.patterns.filter(p =>
        ['high', 'critical'].includes(p.severity)
      );

      expect(highSeverityPatterns.length).toBe(0);
    });
  });

  describe('PostGraphile Connection Patterns', () => {
    test('should detect N+1 in connection node selections', () => {
      const connectionQuery = parse(`
        query ConnectionNPlusOne {
          users(first: 20) {
            edges {
              node {
                id
                name
                managedEmployees {
                  id
                  name
                  department {
                    name
                    manager {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(connectionQuery, { first: 20 });

      expect(optimization.patterns.length).toBeGreaterThan(0);

      // Should account for pagination size in estimation
      const pattern = optimization.patterns.find(p =>
        p.fieldPath.includes('managedEmployees')
      );

      expect(pattern).toBeDefined();
      expect(pattern?.estimatedCallCount).toBeGreaterThan(20);
    });

    test('should handle complex connection nesting', () => {
      const complexConnectionQuery = parse(`
        query ComplexConnection {
          users(first: 50) {
            edges {
              node {
                id
                performanceReviews {
                  id
                  goals {
                    milestones {
                      tasks {
                        assignee {
                          department {
                            employees {
                              skills {
                                id
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(complexConnectionQuery, { first: 50 });

      // Should detect multiple critical patterns
      const criticalPatterns = optimization.patterns.filter(p => p.severity === 'critical');
      expect(criticalPatterns.length).toBeGreaterThan(1);

      // Should have very high estimated call counts
      const extremePattern = optimization.patterns.find(p => p.estimatedCallCount > 1000);
      expect(extremePattern).toBeDefined();
    });
  });

  describe('DataLoader Suggestions', () => {
    test('should generate DataLoader suggestions for detected patterns', () => {
      const query = parse(`
        query NeedsDataLoader {
          departments {
            id
            employees {
              id
              name
              performanceReviews {
                id
                reviewer {
                  name
                }
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(query);

      expect(optimization.dataLoaderSuggestions.length).toBeGreaterThan(0);

      const suggestion = optimization.dataLoaderSuggestions[0];
      expect(suggestion).toHaveProperty('resolverPath');
      expect(suggestion).toHaveProperty('batchKey');
      expect(suggestion).toHaveProperty('loaderType');
      expect(suggestion).toHaveProperty('implementation');
      expect(suggestion).toHaveProperty('estimatedImprovement');

      expect(suggestion.estimatedImprovement).toBeGreaterThan(0);
    });

    test('should provide different loader types based on complexity', () => {
      const simpleQuery = parse(`
        query SimpleLoader {
          employees {
            department {
              name
            }
          }
        }
      `);

      const complexQuery = parse(`
        query ComplexLoader {
          departments {
            employees {
              performanceReviews {
                goals {
                  milestones {
                    tasks {
                      assignee {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `);

      const simpleOptimization = detector.analyzeQuery(simpleQuery);
      const complexOptimization = detector.analyzeQuery(complexQuery);

      // Simple query should suggest simple loader
      const simpleLoader = simpleOptimization.dataLoaderSuggestions.find(s =>
        s.loaderType === 'simple'
      );
      expect(simpleLoader).toBeDefined();

      // Complex query should suggest nested loader
      const nestedLoader = complexOptimization.dataLoaderSuggestions.find(s =>
        s.loaderType === 'nested'
      );
      expect(nestedLoader).toBeDefined();
    });

    test('should generate valid DataLoader implementation code', () => {
      const query = parse(`
        query LoaderImplementation {
          employees {
            id
            department {
              id
              name
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(query);
      const suggestion = optimization.dataLoaderSuggestions[0];

      expect(suggestion.implementation).toContain('DataLoader');
      expect(suggestion.implementation).toContain('async');
      expect(suggestion.implementation).toContain('findMany');
      expect(suggestion.implementation).toMatch(/const \w+Loader/);
    });
  });

  describe('Severity Assessment', () => {
    test('should assign correct severity levels', () => {
      // Low severity query
      const lowSeverityQuery = parse(`
        query LowSeverity {
          employees {
            name
            department {
              name
            }
          }
        }
      `);

      // Critical severity query
      const criticalQuery = parse(`
        query CriticalSeverity {
          departments {
            employees {
              performanceReviews {
                goals {
                  milestones {
                    tasks {
                      dependencies {
                        assignee {
                          directReports {
                            skills {
                              id
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `);

      const lowOptimization = detector.analyzeQuery(lowSeverityQuery);
      const criticalOptimization = detector.analyzeQuery(criticalQuery);

      // Low severity should have fewer or less severe patterns
      const lowSeverityPatterns = lowOptimization.patterns.filter(p => p.severity === 'critical');
      expect(lowSeverityPatterns.length).toBeLessThan(2);

      // Critical query should have multiple critical patterns
      const criticalPatterns = criticalOptimization.patterns.filter(p => p.severity === 'critical');
      expect(criticalPatterns.length).toBeGreaterThan(0);
    });

    test('should consider pagination size in severity calculation', () => {
      const query = parse(`
        query PaginationSeverity {
          users(first: $limit) {
            edges {
              node {
                managedEmployees {
                  department {
                    name
                  }
                }
              }
            }
          }
        }
      `);

      const smallLimitOptimization = detector.analyzeQuery(query, { limit: 5 });
      const largeLimitOptimization = detector.analyzeQuery(query, { limit: 100 });

      // Large pagination should result in higher severity
      const smallSeverities = smallLimitOptimization.patterns.map(p => p.severity);
      const largeSeverities = largeLimitOptimization.patterns.map(p => p.severity);

      const largeCritical = largeSeverities.filter(s => s === 'critical').length;
      const smallCritical = smallSeverities.filter(s => s === 'critical').length;

      expect(largeCritical).toBeGreaterThanOrEqual(smallCritical);
    });
  });

  describe('Performance Optimization Calculations', () => {
    test('should calculate realistic performance gains', () => {
      const query = parse(`
        query PerformanceGain {
          departments {
            employees {
              performanceReviews {
                goals {
                  id
                }
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(query);

      expect(optimization.performanceGain).toBeGreaterThan(0);
      expect(optimization.performanceGain).toBeLessThanOrEqual(100);
      expect(optimization.optimizedComplexity).toBeLessThan(optimization.originalComplexity);
    });

    test('should calculate improvement estimates for DataLoader suggestions', () => {
      const query = parse(`
        query ImprovementEstimate {
          employees {
            department {
              name
            }
            performanceReviews {
              reviewer {
                name
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(query);

      optimization.dataLoaderSuggestions.forEach(suggestion => {
        expect(suggestion.estimatedImprovement).toBeGreaterThan(0);
        expect(suggestion.estimatedImprovement).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Configuration and Filtering', () => {
    test('should respect severity threshold configuration', () => {
      const highThresholdDetector = new NPlusOneDetector({
        severityThreshold: 'high'
      }, testSchema);

      const query = parse(`
        query ThresholdTest {
          employees {
            department {
              name
            }
          }
        }
      `);

      const optimization = highThresholdDetector.analyzeQuery(query);

      // Should only return patterns at or above 'high' severity
      const lowMediumPatterns = optimization.patterns.filter(p =>
        ['low', 'medium'].includes(p.severity)
      );

      expect(lowMediumPatterns.length).toBe(0);
    });

    test('should allow configuration updates', () => {
      detector.updateConfig({
        severityThreshold: 'critical',
        enableDataLoaderSuggestions: false
      });

      const config = detector.getConfig();

      expect(config.severityThreshold).toBe('critical');
      expect(config.enableDataLoaderSuggestions).toBe(false);
    });

    test('should disable DataLoader suggestions when configured', () => {
      detector.updateConfig({
        enableDataLoaderSuggestions: false
      });

      const query = parse(`
        query NoDataLoaderSuggestions {
          employees {
            department {
              name
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(query);

      expect(optimization.dataLoaderSuggestions.length).toBe(0);
    });
  });

  describe('Real-time Monitoring', () => {
    test('should record execution statistics', () => {
      detector.recordExecution('employees.department', 150);
      detector.recordExecution('employees.department', 200);
      detector.recordExecution('users.performanceReviews', 50);

      const stats = detector.getExecutionStats();

      expect(stats.has('employees.department')).toBe(true);
      expect(stats.has('users.performanceReviews')).toBe(true);

      const employeeDeptStats = stats.get('employees.department');
      expect(employeeDeptStats?.count).toBe(2);
      expect(employeeDeptStats?.totalTime).toBe(350);
      expect(employeeDeptStats?.avgTime).toBe(175);
    });

    test('should provide pattern history', () => {
      const query = parse(`
        query PatternHistory {
          employees {
            department {
              name
            }
          }
        }
      `);

      detector.analyzeQuery(query);

      const patterns = detector.getDetectedPatterns();
      expect(patterns.length).toBeGreaterThan(0);

      // Clear and verify
      detector.clearPatterns();
      const clearedPatterns = detector.getDetectedPatterns();
      expect(clearedPatterns.length).toBe(0);
    });
  });

  describe('PostGraphile-Specific Optimization', () => {
    test('should create PostGraphile-optimized detector', () => {
      const pgDetector = createPostGraphileNPlusOneDetector({
        severityThreshold: 'medium'
      }, testSchema);

      const config = pgDetector.getConfig();

      expect(config.maxNestedDepth).toBe(15); // Higher than default
      expect(config.listFieldThreshold).toBe(20); // Higher than default
      expect(config.performanceThreshold).toBe(200); // More lenient
    });

    test('should handle PostGraphile connection patterns appropriately', () => {
      const pgDetector = createPostGraphileNPlusOneDetector({}, testSchema);

      const pgQuery = parse(`
        query PostGraphileConnections {
          users(first: 100) {
            edges {
              node {
                managedEmployees {
                  performanceReviews {
                    goals {
                      milestones {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `);

      const optimization = pgDetector.analyzeQuery(pgQuery, { first: 100 });

      // Should detect patterns but be more lenient given PostGraphile's capabilities
      expect(optimization.patterns.length).toBeGreaterThan(0);

      // Should still provide useful suggestions
      expect(optimization.dataLoaderSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle queries without selections', () => {
      const emptyQuery = parse(`
        query EmptyQuery {
          __typename
        }
      `);

      const optimization = detector.analyzeQuery(emptyQuery);

      expect(optimization.patterns.length).toBe(0);
      expect(optimization.dataLoaderSuggestions.length).toBe(0);
      expect(optimization.performanceGain).toBe(0);
    });

    test('should handle circular reference patterns', () => {
      const circularQuery = parse(`
        query CircularReferences {
          employees {
            manager {
              directReports {
                manager {
                  name
                }
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(circularQuery);

      // Should detect the circular pattern as N+1
      expect(optimization.patterns.length).toBeGreaterThan(0);

      const circularPattern = optimization.patterns.find(p =>
        p.recommendation.toLowerCase().includes('circular') ||
        p.severity === 'high' ||
        p.severity === 'critical'
      );

      expect(circularPattern).toBeDefined();
    });

    test('should provide meaningful recommendations', () => {
      const query = parse(`
        query MeaningfulRecommendations {
          departments {
            employees {
              performanceReviews {
                id
              }
            }
          }
        }
      `);

      const optimization = detector.analyzeQuery(query);

      optimization.patterns.forEach(pattern => {
        expect(pattern.recommendation).toBeTruthy();
        expect(pattern.recommendation.length).toBeGreaterThan(10);
        expect(pattern.recommendation).toMatch(/(DataLoader|batch|optim|denormaliz)/i);
      });
    });
  });
});