/**
 * Query Complexity Analyzer Tests
 *
 * Tests for GraphQL query complexity analysis, depth limiting, and performance monitoring.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { parse, buildSchema } from 'graphql';
import {
	QueryComplexityAnalyzer,
	createPostGraphileAnalyzer,
	DEFAULT_COMPLEXITY_CONFIG
} from '$lib/graphql/query-complexity-analyzer';

// Test schema for complexity analysis
const testSchema = buildSchema(`
  type Query {
    users(first: Int, after: String): UserConnection!
    user(id: ID!): User
    employees(filter: EmployeeFilter): [Employee!]!
    departments: [Department!]!
    complexQuery: ComplexResult
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    employees: [Employee!]!
    permissions: [Permission!]!
    salary: Float
  }

  type Employee {
    id: ID!
    user: User!
    department: Department!
    performanceReviews: [PerformanceReview!]!
  }

  type Department {
    id: ID!
    name: String!
    employees: [Employee!]!
  }

  type PerformanceReview {
    id: ID!
    employee: Employee!
    score: Float!
  }

  type Permission {
    id: ID!
    name: String!
  }

  type ComplexResult {
    computed: String
    aggregatedData: [AggregatedData!]!
  }

  type AggregatedData {
    count: Int!
    sum: Float!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  input EmployeeFilter {
    departmentId: ID
    search: String
    active: Boolean
  }
`);

describe('QueryComplexityAnalyzer', () => {
	let analyzer: QueryComplexityAnalyzer;

	beforeEach(() => {
		analyzer = new QueryComplexityAnalyzer(DEFAULT_COMPLEXITY_CONFIG, testSchema);
	});

	describe('Basic Complexity Analysis', () => {
		test('should calculate complexity for simple query', () => {
			const query = parse(`
        query SimpleQuery {
          user(id: "1") {
            id
            name
            email
          }
        }
      `);

			const metrics = analyzer.analyzeQuery(query);

			expect(metrics.operationType).toBe('query');
			expect(metrics.operationName).toBe('SimpleQuery');
			expect(metrics.complexity).toBeGreaterThan(0);
			expect(metrics.depth).toBe(2);
			expect(metrics.fieldCount).toBe(4); // user + id + name + email
		});

		test('should calculate higher complexity for nested queries', () => {
			const simpleQuery = parse(`
        query SimpleQuery {
          user(id: "1") {
            id
            name
          }
        }
      `);

			const nestedQuery = parse(`
        query NestedQuery {
          user(id: "1") {
            id
            name
            employees {
              id
              department {
                id
                name
              }
            }
          }
        }
      `);

			const simpleMetrics = analyzer.analyzeQuery(simpleQuery);
			const nestedMetrics = analyzer.analyzeQuery(nestedQuery);

			expect(nestedMetrics.complexity).toBeGreaterThan(simpleMetrics.complexity);
			expect(nestedMetrics.depth).toBeGreaterThan(simpleMetrics.depth);
			expect(nestedMetrics.fieldCount).toBeGreaterThan(simpleMetrics.fieldCount);
		});

		test('should handle list fields with higher complexity', () => {
			const listQuery = parse(`
        query ListQuery {
          employees {
            id
            name
          }
        }
      `);

			const metrics = analyzer.analyzeQuery(listQuery);

			expect(metrics.complexity).toBeGreaterThan(DEFAULT_COMPLEXITY_CONFIG.scalarCost);
		});
	});

	describe('PostGraphile Connection Complexity', () => {
		test('should handle connection queries', () => {
			const connectionQuery = parse(`
        query ConnectionQuery {
          users(first: 10, after: "cursor") {
            edges {
              node {
                id
                name
                email
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
          }
        }
      `);

			const metrics = analyzer.analyzeQuery(connectionQuery);

			expect(metrics.complexity).toBeGreaterThan(50); // Connection queries are more complex
			expect(metrics.fieldCount).toBeGreaterThan(8);
		});

		test('should penalize large pagination limits', () => {
			const smallLimitQuery = parse(`
        query SmallLimit {
          users(first: 10) {
            edges {
              node {
                id
              }
            }
          }
        }
      `);

			const largeLimitQuery = parse(`
        query LargeLimit {
          users(first: 1000) {
            edges {
              node {
                id
              }
            }
          }
        }
      `);

			const smallMetrics = analyzer.analyzeQuery(smallLimitQuery, { first: 10 });
			const largeMetrics = analyzer.analyzeQuery(largeLimitQuery, { first: 1000 });

			expect(largeMetrics.complexity).toBeGreaterThan(smallMetrics.complexity);
		});
	});

	describe('Security-Sensitive Fields', () => {
		test('should increase complexity for sensitive fields', () => {
			const regularQuery = parse(`
        query Regular {
          user(id: "1") {
            id
            name
          }
        }
      `);

			const sensitiveQuery = parse(`
        query Sensitive {
          user(id: "1") {
            id
            name
            permissions {
              id
              name
            }
            salary
          }
        }
      `);

			const regularMetrics = analyzer.analyzeQuery(regularQuery);
			const sensitiveMetrics = analyzer.analyzeQuery(sensitiveQuery);

			expect(sensitiveMetrics.complexity).toBeGreaterThan(regularMetrics.complexity + 10);
		});
	});

	describe('Complexity Validation', () => {
		test('should pass validation for reasonable queries', () => {
			const reasonableQuery = parse(`
        query Reasonable {
          users(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `);

			const errors = analyzer.validateComplexity(reasonableQuery);
			expect(errors).toEqual([]);
		});

		test('should reject overly complex queries', () => {
			// Create an analyzer with very low limits for testing
			const strictAnalyzer = new QueryComplexityAnalyzer(
				{
					maximumComplexity: 10,
					depthLimit: 3
				},
				testSchema
			);

			const complexQuery = parse(`
        query VeryComplex {
          users(first: 100) {
            edges {
              node {
                id
                name
                employees {
                  id
                  department {
                    id
                    name
                    employees {
                      id
                      performanceReviews {
                        id
                        score
                      }
                    }
                  }
                }
                permissions {
                  id
                  name
                }
              }
            }
            totalCount
          }
        }
      `);

			const errors = strictAnalyzer.validateComplexity(complexQuery);
			expect(errors.length).toBeGreaterThan(0);

			const complexityError = errors.find(
				(e) => e.extensions?.code === 'QUERY_COMPLEXITY_TOO_HIGH'
			);
			const depthError = errors.find((e) => e.extensions?.code === 'QUERY_DEPTH_TOO_HIGH');

			expect(complexityError || depthError).toBeDefined();
		});

		test('should reject queries exceeding depth limit', () => {
			const deepAnalyzer = new QueryComplexityAnalyzer(
				{
					maximumComplexity: 10000,
					depthLimit: 3
				},
				testSchema
			);

			const deepQuery = parse(`
        query DeepQuery {
          user(id: "1") {
            employees {
              department {
                employees {
                  performanceReviews {
                    employee {
                      user {
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

			const errors = deepAnalyzer.validateComplexity(deepQuery);
			expect(errors.length).toBeGreaterThan(0);

			const depthError = errors.find((e) => e.extensions?.code === 'QUERY_DEPTH_TOO_HIGH');
			expect(depthError).toBeDefined();
		});
	});

	describe('N+1 Query Detection', () => {
		test('should detect potential N+1 queries', () => {
			const nPlusOneQuery = parse(`
        query PotentialNPlusOne {
          employees {
            id
            department {
              id
              name
            }
            performanceReviews {
              id
              score
            }
          }
        }
      `);

			const analysis = analyzer.analyzeForNPlusOne(nPlusOneQuery);

			expect(analysis.potentialNPlusOne).toBe(true);
			expect(analysis.recommendations.length).toBeGreaterThan(0);
			expect(
				analysis.recommendations.some(
					(r) => r.toLowerCase().includes('dataloader') || r.toLowerCase().includes('batch')
				)
			).toBe(true);
		});

		test('should provide optimization recommendations', () => {
			const inefficientQuery = parse(`
        query Inefficient {
          users(first: 100) {
            edges {
              node {
                employees {
                  department {
                    name
                  }
                }
                employees {
                  performanceReviews {
                    score
                  }
                }
              }
            }
          }
        }
      `);

			const analysis = analyzer.analyzeForNPlusOne(inefficientQuery);

			expect(analysis.duplicateQueries.length).toBeGreaterThan(0);
			expect(analysis.recommendations.length).toBeGreaterThan(0);
		});
	});

	describe('PostGraphile-Specific Features', () => {
		test('should handle computed fields', () => {
			const computedQuery = parse(`
        query ComputedFields {
          complexQuery {
            computed
            aggregatedData {
              count
              sum
            }
          }
        }
      `);

			const metrics = analyzer.analyzeQuery(computedQuery);

			// Computed fields should have higher complexity
			expect(metrics.complexity).toBeGreaterThan(20);
		});

		test('should handle filter arguments', () => {
			const filteredQuery = parse(`
        query FilteredQuery {
          employees(filter: { departmentId: "1", search: "john", active: true }) {
            id
            name
          }
        }
      `);

			const variables = {
				filter: {
					departmentId: '1',
					search: 'john',
					active: true
				}
			};

			const metrics = analyzer.analyzeQuery(filteredQuery, variables);

			// Filtered queries should have additional complexity
			expect(metrics.complexity).toBeGreaterThan(10);
		});
	});

	describe('Configuration Management', () => {
		test('should allow configuration updates', () => {
			const originalConfig = analyzer.getConfig();

			analyzer.updateConfig({
				maximumComplexity: 500,
				depthLimit: 10
			});

			const newConfig = analyzer.getConfig();

			expect(newConfig.maximumComplexity).toBe(500);
			expect(newConfig.depthLimit).toBe(10);
			expect(newConfig.scalarCost).toBe(originalConfig.scalarCost); // Unchanged
		});

		test('should create PostGraphile-optimized analyzer', () => {
			const pgAnalyzer = createPostGraphileAnalyzer(
				{
					maximumComplexity: 3000
				},
				testSchema
			);

			const config = pgAnalyzer.getConfig();

			expect(config.maximumComplexity).toBe(3000);
			expect(config.depthLimit).toBe(20); // PostGraphile default
			expect(config.listFactor).toBe(5); // PostGraphile optimized
		});
	});

	describe('Performance Metrics', () => {
		test('should measure analysis execution time', () => {
			const query = parse(`
        query PerformanceTest {
          users(first: 50) {
            edges {
              node {
                id
                name
                employees {
                  id
                  department {
                    name
                  }
                }
              }
            }
          }
        }
      `);

			const metrics = analyzer.analyzeQuery(query);

			expect(metrics.executionTime).toBeGreaterThan(0);
			expect(typeof metrics.executionTime).toBe('number');
		});

		test('should provide comprehensive metrics', () => {
			const query = parse(`
        query ComprehensiveTest {
          user(id: "1") {
            id
            name
            employees {
              id
            }
          }
        }
      `);

			const metrics = analyzer.analyzeQuery(query);

			expect(metrics).toHaveProperty('operationName');
			expect(metrics).toHaveProperty('operationType');
			expect(metrics).toHaveProperty('executionTime');
			expect(metrics).toHaveProperty('complexity');
			expect(metrics).toHaveProperty('depth');
			expect(metrics).toHaveProperty('fieldCount');
			expect(metrics).toHaveProperty('errorCount');
			expect(metrics).toHaveProperty('cacheHitRatio');

			expect(typeof metrics.complexity).toBe('number');
			expect(typeof metrics.depth).toBe('number');
			expect(typeof metrics.fieldCount).toBe('number');
		});
	});

	describe('Error Handling', () => {
		test('should handle invalid queries gracefully', () => {
			// Create a malformed document for testing
			const invalidQuery = {
				kind: 'Document',
				definitions: []
			} as any;

			const metrics = analyzer.analyzeQuery(invalidQuery);

			expect(metrics.errorCount).toBeGreaterThanOrEqual(0);
			expect(metrics.complexity).toBeGreaterThanOrEqual(0);
		});

		test('should provide meaningful error messages', () => {
			const complexQuery = parse(`
        query TooComplex {
          users { edges { node { id name email } } }
        }
      `);

			const strictAnalyzer = new QueryComplexityAnalyzer({
				maximumComplexity: 1,
				depthLimit: 1
			});

			const errors = strictAnalyzer.validateComplexity(complexQuery);

			expect(errors.length).toBeGreaterThan(0);
			errors.forEach((error) => {
				expect(error.message).toBeTruthy();
				expect(error.extensions?.code).toBeTruthy();
			});
		});
	});
});
