// API Response Contract Tests for SvelteHR
// Tests API response structure and data integrity
// Created: 2025-09-24

import { describe, expect, test } from 'vitest';
import { z } from 'zod';

// Response Schema Definitions
const EmployeeSchema = z.object({
	id: z.string().uuid(),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	email: z.string().email(),
	role: z.enum(['ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE']),
	departmentId: z.string().uuid(),
	managerId: z.string().uuid().nullable(),
	hireDate: z.string().datetime(),
	performanceRating: z.number().min(0).max(5).nullable(),
	status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
});

const DepartmentSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().nullable(),
	managerId: z.string().uuid(),
	budget: z.number().positive().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
});

const PerformanceReviewSchema = z.object({
	id: z.string().uuid(),
	employeeId: z.string().uuid(),
	reviewerId: z.string().uuid(),
	reviewPeriodStart: z.string().datetime(),
	reviewPeriodEnd: z.string().datetime(),
	overallRating: z.number().min(1).max(5),
	feedback: z.string().nullable(),
	status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
});

const LeaveRequestSchema = z
	.object({
		id: z.string().uuid(),
		employeeId: z.string().uuid(),
		leaveType: z.enum([
			'VACATION',
			'SICK_LEAVE',
			'PERSONAL',
			'BEREAVEMENT',
			'MATERNITY',
			'PATERNITY'
		]),
		startDate: z.string().datetime(),
		endDate: z.string().datetime(),
		daysRequested: z.number().positive(),
		reason: z.string().nullable(),
		status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
		approverId: z.string().uuid().nullable(),
		approvedAt: z.string().datetime().nullable(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime()
	})
	.refine(
		(data) => {
			const start = new Date(data.startDate);
			const end = new Date(data.endDate);
			return end > start;
		},
		{
			message: 'endDate must be after startDate',
			path: ['endDate']
		}
	);

const GoalSchema = z.object({
	id: z.string().uuid(),
	employeeId: z.string().uuid(),
	title: z.string().min(1),
	description: z.string().nullable(),
	targetDate: z.string().datetime(),
	progress: z.number().min(0).max(100),
	status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
	category: z.enum(['PERFORMANCE', 'DEVELOPMENT', 'STRATEGIC', 'OPERATIONAL']),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
});

const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
	z.object({
		data: z.array(itemSchema),
		pagination: z.object({
			page: z.number().positive(),
			limit: z.number().positive(),
			total: z.number().nonnegative(),
			totalPages: z.number().positive(),
			hasNext: z.boolean(),
			hasPrev: z.boolean()
		})
	});

const GraphQLResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		data: dataSchema.nullable(),
		errors: z
			.array(
				z.object({
					message: z.string(),
					locations: z.array(z.object({ line: z.number(), column: z.number() })).optional(),
					path: z.array(z.union([z.string(), z.number()])).optional(),
					extensions: z.record(z.string(), z.any()).optional()
				})
			)
			.optional()
	});

const ErrorResponseSchema = z.object({
	error: z.object({
		message: z.string(),
		code: z.string(),
		details: z.record(z.string(), z.any()).optional(),
		timestamp: z.string().datetime()
	})
});

describe('API Response Contract Tests', () => {
	test('should validate employee list response structure', () => {
		const mockResponse = {
			data: [
				{
					id: '550e8400-e29b-41d4-a716-446655440000',
					firstName: 'John',
					lastName: 'Doe',
					email: 'john.doe@company.com',
					role: 'EMPLOYEE' as const,
					departmentId: '550e8400-e29b-41d4-a716-446655440001',
					managerId: '550e8400-e29b-41d4-a716-446655440002',
					hireDate: '2024-01-15T08:00:00Z',
					performanceRating: 4.2,
					status: 'ACTIVE' as const,
					createdAt: '2024-01-15T08:00:00Z',
					updatedAt: '2024-09-24T10:30:00Z'
				}
			],
			pagination: {
				page: 1,
				limit: 20,
				total: 1,
				totalPages: 1,
				hasNext: false,
				hasPrev: false
			}
		};

		const result = PaginatedResponseSchema(EmployeeSchema).safeParse(mockResponse);
		expect(result.success).toBe(true);
	});

	test('should validate department response structure', () => {
		const mockResponse = {
			id: '550e8400-e29b-41d4-a716-446655440001',
			name: 'Engineering',
			description: 'Software development and engineering team',
			managerId: '550e8400-e29b-41d4-a716-446655440002',
			budget: 500000.0,
			createdAt: '2024-01-01T08:00:00Z',
			updatedAt: '2024-09-24T10:30:00Z'
		};

		const result = DepartmentSchema.safeParse(mockResponse);
		expect(result.success).toBe(true);
	});

	test('should validate performance review response structure', () => {
		const mockResponse = {
			id: '550e8400-e29b-41d4-a716-446655440003',
			employeeId: '550e8400-e29b-41d4-a716-446655440000',
			reviewerId: '550e8400-e29b-41d4-a716-446655440002',
			reviewPeriodStart: '2024-01-01T00:00:00Z',
			reviewPeriodEnd: '2024-12-31T23:59:59Z',
			overallRating: 4.5,
			feedback: 'Excellent performance this year, exceeded expectations.',
			status: 'COMPLETED' as const,
			createdAt: '2024-01-15T08:00:00Z',
			updatedAt: '2024-09-24T10:30:00Z'
		};

		const result = PerformanceReviewSchema.safeParse(mockResponse);
		expect(result.success).toBe(true);
	});

	test('should validate leave request response structure', () => {
		const mockResponse = {
			id: '550e8400-e29b-41d4-a716-446655440004',
			employeeId: '550e8400-e29b-41d4-a716-446655440000',
			leaveType: 'VACATION' as const,
			startDate: '2024-12-01T00:00:00Z',
			endDate: '2024-12-05T23:59:59Z',
			daysRequested: 5,
			reason: 'Winter vacation with family',
			status: 'APPROVED' as const,
			approverId: '550e8400-e29b-41d4-a716-446655440002',
			approvedAt: '2024-11-15T14:30:00Z',
			createdAt: '2024-11-10T09:00:00Z',
			updatedAt: '2024-11-15T14:30:00Z'
		};

		const result = LeaveRequestSchema.safeParse(mockResponse);
		expect(result.success).toBe(true);
	});

	test('should validate goal response structure', () => {
		const mockResponse = {
			id: '550e8400-e29b-41d4-a716-446655440005',
			employeeId: '550e8400-e29b-41d4-a716-446655440000',
			title: 'Complete React certification',
			description: 'Obtain React Developer Certification from Meta',
			targetDate: '2024-12-31T23:59:59Z',
			progress: 75.0,
			status: 'IN_PROGRESS' as const,
			category: 'DEVELOPMENT' as const,
			createdAt: '2024-01-15T08:00:00Z',
			updatedAt: '2024-09-24T10:30:00Z'
		};

		const result = GoalSchema.safeParse(mockResponse);
		expect(result.success).toBe(true);
	});

	test('should validate GraphQL response structure with data', () => {
		const mockGraphQLResponse = {
			data: {
				employees: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						firstName: 'John',
						lastName: 'Doe',
						email: 'john.doe@company.com',
						role: 'EMPLOYEE' as const,
						departmentId: '550e8400-e29b-41d4-a716-446655440001',
						managerId: '550e8400-e29b-41d4-a716-446655440002',
						hireDate: '2024-01-15T08:00:00Z',
						performanceRating: 4.2,
						status: 'ACTIVE' as const,
						createdAt: '2024-01-15T08:00:00Z',
						updatedAt: '2024-09-24T10:30:00Z'
					}
				]
			}
		};

		const dataSchema = z.object({
			employees: z.array(EmployeeSchema)
		});

		const result = GraphQLResponseSchema(dataSchema).safeParse(mockGraphQLResponse);
		expect(result.success).toBe(true);
	});

	test('should validate GraphQL error response structure', () => {
		const mockErrorResponse = {
			data: null,
			errors: [
				{
					message: 'Employee not found',
					locations: [{ line: 2, column: 3 }],
					path: ['employee'],
					extensions: {
						code: 'NOT_FOUND',
						exception: {
							stacktrace: ['Error: Employee not found', '  at resolver...']
						}
					}
				}
			]
		};

		const result = GraphQLResponseSchema(z.any()).safeParse(mockErrorResponse);
		expect(result.success).toBe(true);
	});

	test('should validate error response structure', () => {
		const mockErrorResponse = {
			error: {
				message: 'Access denied',
				code: 'FORBIDDEN',
				details: {
					requiredRole: 'MANAGER',
					currentRole: 'EMPLOYEE'
				},
				timestamp: '2024-09-24T10:30:00Z'
			}
		};

		const result = ErrorResponseSchema.safeParse(mockErrorResponse);
		expect(result.success).toBe(true);
	});

	test('should reject invalid employee response structure', () => {
		const invalidResponse = {
			id: 'not-a-uuid',
			firstName: '',
			lastName: 'Doe',
			email: 'invalid-email',
			role: 'INVALID_ROLE',
			departmentId: '550e8400-e29b-41d4-a716-446655440001',
			managerId: '550e8400-e29b-41d4-a716-446655440002',
			hireDate: 'invalid-date',
			performanceRating: 6, // Above max
			status: 'ACTIVE' as const,
			createdAt: '2024-01-15T08:00:00Z',
			updatedAt: '2024-09-24T10:30:00Z'
		};

		const result = EmployeeSchema.safeParse(invalidResponse);
		expect(result.success).toBe(false);
		if (!result.success) {
			const issues = result.error.issues;
			expect(issues.some((issue) => issue.path.includes('id'))).toBe(true);
			expect(issues.some((issue) => issue.path.includes('firstName'))).toBe(true);
			expect(issues.some((issue) => issue.path.includes('email'))).toBe(true);
			expect(issues.some((issue) => issue.path.includes('role'))).toBe(true);
			expect(issues.some((issue) => issue.path.includes('performanceRating'))).toBe(true);
		}
	});

	test('should validate pagination metadata constraints', () => {
		const invalidPagination = {
			data: [],
			pagination: {
				page: 0, // Should be positive
				limit: -10, // Should be positive
				total: -1, // Should be non-negative
				totalPages: 0, // Should be positive
				hasNext: 'not-boolean', // Should be boolean
				hasPrev: 'not-boolean' // Should be boolean
			}
		};

		const result = PaginatedResponseSchema(EmployeeSchema).safeParse(invalidPagination);
		expect(result.success).toBe(false);
	});

	test('should validate required fields presence', () => {
		const incompleteEmployee = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			firstName: 'John'
			// Missing required fields: lastName, email, role, etc.
		};

		const result = EmployeeSchema.safeParse(incompleteEmployee);
		expect(result.success).toBe(false);
	});

	test('should validate enum value constraints', () => {
		const employeeWithInvalidEnum = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@company.com',
			role: 'SUPER_ADMIN', // Invalid role
			departmentId: '550e8400-e29b-41d4-a716-446655440001',
			managerId: null,
			hireDate: '2024-01-15T08:00:00Z',
			performanceRating: 4.2,
			status: 'WORKING', // Invalid status
			createdAt: '2024-01-15T08:00:00Z',
			updatedAt: '2024-09-24T10:30:00Z'
		};

		const result = EmployeeSchema.safeParse(employeeWithInvalidEnum);
		expect(result.success).toBe(false);
	});

	test('should validate performance rating range', () => {
		const employeeWithInvalidRating = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@company.com',
			role: 'EMPLOYEE' as const,
			departmentId: '550e8400-e29b-41d4-a716-446655440001',
			managerId: null,
			hireDate: '2024-01-15T08:00:00Z',
			performanceRating: 10.5, // Above max rating of 5
			status: 'ACTIVE' as const,
			createdAt: '2024-01-15T08:00:00Z',
			updatedAt: '2024-09-24T10:30:00Z'
		};

		const result = EmployeeSchema.safeParse(employeeWithInvalidRating);
		expect(result.success).toBe(false);
	});

	test('should validate goal progress percentage', () => {
		const goalWithInvalidProgress = {
			id: '550e8400-e29b-41d4-a716-446655440005',
			employeeId: '550e8400-e29b-41d4-a716-446655440000',
			title: 'Complete certification',
			description: 'Test goal',
			targetDate: '2024-12-31T23:59:59Z',
			progress: 150.0, // Above 100%
			status: 'IN_PROGRESS' as const,
			category: 'DEVELOPMENT' as const,
			createdAt: '2024-01-15T08:00:00Z',
			updatedAt: '2024-09-24T10:30:00Z'
		};

		const result = GoalSchema.safeParse(goalWithInvalidProgress);
		expect(result.success).toBe(false);
	});

	test('should validate leave request date logic', () => {
		const leaveWithInvalidDays = {
			id: '550e8400-e29b-41d4-a716-446655440004',
			employeeId: '550e8400-e29b-41d4-a716-446655440000',
			leaveType: 'VACATION' as const,
			startDate: '2024-12-01T00:00:00Z',
			endDate: '2024-12-05T23:59:59Z',
			daysRequested: -5, // Negative days
			reason: 'Test vacation',
			status: 'PENDING' as const,
			approverId: null,
			approvedAt: null,
			createdAt: '2024-11-10T09:00:00Z',
			updatedAt: '2024-11-10T09:00:00Z'
		};

		const result = LeaveRequestSchema.safeParse(leaveWithInvalidDays);
		expect(result.success).toBe(false);
	});

	test('should validate response time performance', () => {
		const startTime = Date.now();

		// Simulate response validation for large dataset
		const largeDataset = Array(100)
			.fill(null)
			.map((_, index) => ({
				id: `550e8400-e29b-41d4-a716-44665544${index.toString().padStart(4, '0')}`,
				firstName: `Employee${index}`,
				lastName: 'Test',
				email: `employee${index}@company.com`,
				role: 'EMPLOYEE' as const,
				departmentId: '550e8400-e29b-41d4-a716-446655440001',
				managerId: '550e8400-e29b-41d4-a716-446655440002',
				hireDate: '2024-01-15T08:00:00Z',
				performanceRating: 4.0,
				status: 'ACTIVE' as const,
				createdAt: '2024-01-15T08:00:00Z',
				updatedAt: '2024-09-24T10:30:00Z'
			}));

		const mockResponse = {
			data: largeDataset,
			pagination: {
				page: 1,
				limit: 100,
				total: 100,
				totalPages: 1,
				hasNext: false,
				hasPrev: false
			}
		};

		const result = PaginatedResponseSchema(EmployeeSchema).safeParse(mockResponse);
		const endTime = Date.now();

		expect(result.success).toBe(true);
		expect(endTime - startTime).toBeLessThan(200); // Performance target: <200ms
	});
});
