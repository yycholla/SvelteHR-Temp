// GraphQL Contract Tests for SvelteHR
// Tests GraphQL schema contracts and API consistency
// Created: 2025-09-24

import { test, expect } from 'vitest';
import { graphql, buildSchema, validate, parse } from 'graphql';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock GraphQL schema for contract testing
const mockSchema = buildSchema(`
  type Query {
    employees: [Employee!]!
    employee(id: ID!): Employee
    departments: [Department!]!
    performanceReviews: [PerformanceReview!]!
    leaveRequests: [LeaveRequest!]!
    goals: [Goal!]!
  }

  type Mutation {
    createEmployee(input: CreateEmployeeInput!): Employee!
    updateEmployee(id: ID!, input: UpdateEmployeeInput!): Employee!
    deleteEmployee(id: ID!): Boolean!
    createPerformanceReview(input: CreatePerformanceReviewInput!): PerformanceReview!
    createLeaveRequest(input: CreateLeaveRequestInput!): LeaveRequest!
    approveLeaveRequest(id: ID!): LeaveRequest!
    createGoal(input: CreateGoalInput!): Goal!
    updateGoalProgress(id: ID!, progress: Float!): Goal!
  }

  type Employee {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: EmployeeRole!
    department: Department!
    hireDate: String!
    performanceRating: Float
    status: EmployeeStatus!
    manager: Employee
    directReports: [Employee!]!
    createdAt: String!
    updatedAt: String!
  }

  type Department {
    id: ID!
    name: String!
    description: String
    manager: Employee!
    employees: [Employee!]!
    budget: Float
    createdAt: String!
    updatedAt: String!
  }

  type PerformanceReview {
    id: ID!
    employee: Employee!
    reviewer: Employee!
    reviewPeriodStart: String!
    reviewPeriodEnd: String!
    overallRating: Float!
    goals: [Goal!]!
    feedback: String
    status: ReviewStatus!
    createdAt: String!
    updatedAt: String!
  }

  type LeaveRequest {
    id: ID!
    employee: Employee!
    leaveType: LeaveType!
    startDate: String!
    endDate: String!
    daysRequested: Int!
    reason: String
    status: LeaveStatus!
    approver: Employee
    approvedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type Goal {
    id: ID!
    employee: Employee!
    title: String!
    description: String
    targetDate: String!
    progress: Float!
    status: GoalStatus!
    category: GoalCategory!
    createdAt: String!
    updatedAt: String!
  }

  enum EmployeeRole {
    ADMIN
    HR_MANAGER
    MANAGER
    EMPLOYEE
  }

  enum EmployeeStatus {
    ACTIVE
    INACTIVE
    TERMINATED
    ON_LEAVE
  }

  enum ReviewStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  enum LeaveType {
    VACATION
    SICK_LEAVE
    PERSONAL
    BEREAVEMENT
    MATERNITY
    PATERNITY
  }

  enum LeaveStatus {
    PENDING
    APPROVED
    REJECTED
    CANCELLED
  }

  enum GoalStatus {
    NOT_STARTED
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  enum GoalCategory {
    PERFORMANCE
    DEVELOPMENT
    STRATEGIC
    OPERATIONAL
  }

  input CreateEmployeeInput {
    firstName: String!
    lastName: String!
    email: String!
    role: EmployeeRole!
    departmentId: ID!
    hireDate: String!
    managerId: ID
  }

  input UpdateEmployeeInput {
    firstName: String
    lastName: String
    email: String
    role: EmployeeRole
    departmentId: ID
    managerId: ID
    status: EmployeeStatus
  }

  input CreatePerformanceReviewInput {
    employeeId: ID!
    reviewPeriodStart: String!
    reviewPeriodEnd: String!
    overallRating: Float!
    feedback: String
  }

  input CreateLeaveRequestInput {
    employeeId: ID!
    leaveType: LeaveType!
    startDate: String!
    endDate: String!
    reason: String
  }

  input CreateGoalInput {
    employeeId: ID!
    title: String!
    description: String
    targetDate: String!
    category: GoalCategory!
  }
`);

test.describe('GraphQL Schema Contract Tests', () => {
	test('should validate employee queries structure', () => {
		const query = `
      query GetEmployees {
        employees {
          id
          firstName
          lastName
          email
          role
          department {
            id
            name
          }
          manager {
            id
            firstName
            lastName
          }
          status
          hireDate
          createdAt
          updatedAt
        }
      }
    `;

		const document = parse(query);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate employee by ID query', () => {
		const query = `
      query GetEmployee($id: ID!) {
        employee(id: $id) {
          id
          firstName
          lastName
          email
          role
          department {
            id
            name
            manager {
              id
              firstName
              lastName
            }
          }
          directReports {
            id
            firstName
            lastName
            role
          }
          performanceRating
          status
          hireDate
        }
      }
    `;

		const document = parse(query);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate performance review queries', () => {
		const query = `
      query GetPerformanceReviews {
        performanceReviews {
          id
          employee {
            id
            firstName
            lastName
          }
          reviewer {
            id
            firstName
            lastName
          }
          reviewPeriodStart
          reviewPeriodEnd
          overallRating
          feedback
          status
          goals {
            id
            title
            progress
            status
          }
          createdAt
          updatedAt
        }
      }
    `;

		const document = parse(query);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate leave request queries', () => {
		const query = `
      query GetLeaveRequests {
        leaveRequests {
          id
          employee {
            id
            firstName
            lastName
            department {
              name
            }
          }
          leaveType
          startDate
          endDate
          daysRequested
          reason
          status
          approver {
            id
            firstName
            lastName
          }
          approvedAt
          createdAt
        }
      }
    `;

		const document = parse(query);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate goal queries', () => {
		const query = `
      query GetGoals {
        goals {
          id
          employee {
            id
            firstName
            lastName
          }
          title
          description
          targetDate
          progress
          status
          category
          createdAt
          updatedAt
        }
      }
    `;

		const document = parse(query);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate department queries', () => {
		const query = `
      query GetDepartments {
        departments {
          id
          name
          description
          manager {
            id
            firstName
            lastName
          }
          employees {
            id
            firstName
            lastName
            role
            status
          }
          budget
          createdAt
          updatedAt
        }
      }
    `;

		const document = parse(query);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate create employee mutation', () => {
		const mutation = `
      mutation CreateEmployee($input: CreateEmployeeInput!) {
        createEmployee(input: $input) {
          id
          firstName
          lastName
          email
          role
          department {
            id
            name
          }
          hireDate
          status
          createdAt
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate update employee mutation', () => {
		const mutation = `
      mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
        updateEmployee(id: $id, input: $input) {
          id
          firstName
          lastName
          email
          role
          department {
            id
            name
          }
          status
          updatedAt
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate create performance review mutation', () => {
		const mutation = `
      mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
        createPerformanceReview(input: $input) {
          id
          employee {
            id
            firstName
            lastName
          }
          reviewer {
            id
            firstName
            lastName
          }
          reviewPeriodStart
          reviewPeriodEnd
          overallRating
          feedback
          status
          createdAt
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate create leave request mutation', () => {
		const mutation = `
      mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
        createLeaveRequest(input: $input) {
          id
          employee {
            id
            firstName
            lastName
          }
          leaveType
          startDate
          endDate
          daysRequested
          reason
          status
          createdAt
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate approve leave request mutation', () => {
		const mutation = `
      mutation ApproveLeaveRequest($id: ID!) {
        approveLeaveRequest(id: $id) {
          id
          status
          approver {
            id
            firstName
            lastName
          }
          approvedAt
          updatedAt
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate create goal mutation', () => {
		const mutation = `
      mutation CreateGoal($input: CreateGoalInput!) {
        createGoal(input: $input) {
          id
          employee {
            id
            firstName
            lastName
          }
          title
          description
          targetDate
          progress
          status
          category
          createdAt
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate update goal progress mutation', () => {
		const mutation = `
      mutation UpdateGoalProgress($id: ID!, $progress: Float!) {
        updateGoalProgress(id: $id, progress: $progress) {
          id
          title
          progress
          status
          updatedAt
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate delete employee mutation', () => {
		const mutation = `
      mutation DeleteEmployee($id: ID!) {
        deleteEmployee(id: $id)
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should enforce required fields in input types', () => {
		const mutation = `
      mutation CreateEmployeeWithMissingField {
        createEmployee(input: {
          firstName: "John"
          # Missing required lastName, email, role, departmentId, hireDate
        }) {
          id
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.some((error) => error.message.includes('required'))).toBeTruthy();
	});

	test('should validate enum values', () => {
		const mutation = `
      mutation CreateEmployeeWithInvalidRole {
        createEmployee(input: {
          firstName: "John"
          lastName: "Doe"
          email: "john@example.com"
          role: INVALID_ROLE
          departmentId: "1"
          hireDate: "2024-01-01"
        }) {
          id
        }
      }
    `;

		const document = parse(mutation);
		const errors = validate(mockSchema, document);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.some((error) => error.message.includes('INVALID_ROLE'))).toBeTruthy();
	});

	test('should validate complex nested queries', () => {
		const query = `
      query ComplexEmployeeQuery {
        employees {
          id
          firstName
          lastName
          department {
            id
            name
            manager {
              id
              firstName
              lastName
              department {
                id
                name
              }
            }
            employees {
              id
              firstName
              lastName
              role
              directReports {
                id
                firstName
                lastName
                role
              }
            }
          }
          manager {
            id
            firstName
            lastName
            directReports {
              id
              firstName
              lastName
              role
              status
            }
          }
        }
      }
    `;

		const document = parse(query);
		const errors = validate(mockSchema, document);
		expect(errors).toHaveLength(0);
	});

	test('should validate performance targets are met', () => {
		// Test that critical queries can be parsed and validated within 200ms
		const startTime = Date.now();

		const query = `
      query PerformanceCriticalQuery {
        employees {
          id
          firstName
          lastName
          email
          role
          status
        }
        departments {
          id
          name
          employees {
            id
            firstName
            lastName
            role
          }
        }
      }
    `;

		const document = parse(query);
		const errors = validate(mockSchema, document);
		const endTime = Date.now();

		expect(errors).toHaveLength(0);
		expect(endTime - startTime).toBeLessThan(200); // Performance target: <200ms
	});
});
