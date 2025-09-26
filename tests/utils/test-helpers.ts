// Test Helper Utilities for SvelteHR
// Database configuration, authentication, and test data management
// Created: 2025-09-24

import { vi } from 'vitest';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';

// Test configuration constants
export const TEST_CONFIG = {
	DATABASE_URL:
		process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/sveltehr_test',
	JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
	API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
	GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
	DEFAULT_TIMEOUT: 30000,
	CLEANUP_TIMEOUT: 10000
} as const;

// User role definitions matching RBAC system
export enum UserRole {
	ADMIN = 'ADMIN',
	HR_MANAGER = 'HR_MANAGER',
	MANAGER = 'MANAGER',
	EMPLOYEE = 'EMPLOYEE'
}

// User role hierarchy levels
export const ROLE_LEVELS = {
	[UserRole.ADMIN]: 100,
	[UserRole.HR_MANAGER]: 80,
	[UserRole.MANAGER]: 60,
	[UserRole.EMPLOYEE]: 20
} as const;

// Permission definitions
export type Permission =
	| 'employees:read'
	| 'employees:write'
	| 'employees:delete'
	| 'departments:read'
	| 'departments:write'
	| 'departments:delete'
	| 'performance:read'
	| 'performance:write'
	| 'performance:delete'
	| 'goals:read'
	| 'goals:write'
	| 'goals:delete'
	| 'leave:read'
	| 'leave:write'
	| 'leave:approve'
	| 'reports:view'
	| 'reports:generate'
	| 'admin:all'
	| '*';

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
	[UserRole.ADMIN]: ['*'],
	[UserRole.HR_MANAGER]: [
		'employees:read',
		'employees:write',
		'employees:delete',
		'departments:read',
		'departments:write',
		'performance:read',
		'performance:write',
		'goals:read',
		'goals:write',
		'leave:read',
		'leave:write',
		'leave:approve',
		'reports:view',
		'reports:generate'
	],
	[UserRole.MANAGER]: [
		'employees:read',
		'performance:read',
		'performance:write',
		'goals:read',
		'goals:write',
		'leave:read',
		'leave:approve',
		'reports:view'
	],
	[UserRole.EMPLOYEE]: ['performance:read', 'goals:read', 'leave:read', 'leave:write']
};

// Test user interface
export interface TestUserData {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	departmentId?: string;
	managerId?: string;
	token: string;
	permissions: Permission[];
	createdAt: string;
}

// Test employee interface
export interface TestEmployeeData {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: UserRole;
	departmentId: string;
	managerId?: string;
	hireDate: string;
	status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE';
	createdAt: string;
	updatedAt: string;
}

// Test department interface
export interface TestDepartmentData {
	id: string;
	name: string;
	description?: string;
	managerId: string;
	budget?: number;
	createdAt: string;
	updatedAt: string;
}

// Test context interface
export interface TestContext {
	users: {
		admin: TestUserData;
		hrManager: TestUserData;
		manager: TestUserData;
		employee: TestUserData;
	};
	departments: {
		engineering: TestDepartmentData;
		marketing: TestDepartmentData;
		hr: TestDepartmentData;
	};
	createdEmployees: string[];
	createdUsers: string[];
	createdDepartments: string[];
	createdReviews: string[];
	createdGoals: string[];
	createdLeaveRequests: string[];
}

// JWT token utilities
export class JWTTestUtils {
	/**
	 * Generate JWT token for test user
	 */
	static generateToken(userData: Partial<TestUserData>, expiresIn: string = '1h'): string {
		const payload = {
			id: userData.id || nanoid(),
			email: userData.email || 'test@example.com',
			role: userData.role || UserRole.EMPLOYEE,
			permissions: userData.permissions || ROLE_PERMISSIONS[userData.role || UserRole.EMPLOYEE],
			departmentId: userData.departmentId,
			iat: Math.floor(Date.now() / 1000)
		};

		return jwt.sign(payload, TEST_CONFIG.JWT_SECRET, { expiresIn });
	}

	/**
	 * Decode and verify JWT token
	 */
	static verifyToken(token: string): any {
		return jwt.verify(token, TEST_CONFIG.JWT_SECRET);
	}

	/**
	 * Generate expired token for testing
	 */
	static generateExpiredToken(userData: Partial<TestUserData>): string {
		return this.generateToken(userData, '-1h'); // Expired 1 hour ago
	}

	/**
	 * Generate invalid token for testing
	 */
	static generateInvalidToken(): string {
		return jwt.sign({ test: 'invalid' }, 'wrong-secret');
	}
}

// Test user factory
export class TestUser {
	/**
	 * Create admin test user
	 */
	static async createAdmin(overrides: Partial<TestUserData> = {}): Promise<TestUserData> {
		const id = nanoid();
		const userData: TestUserData = {
			id,
			email: `admin-${id}@test.com`,
			firstName: 'Admin',
			lastName: 'User',
			role: UserRole.ADMIN,
			permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
			createdAt: new Date().toISOString(),
			token: '',
			...overrides
		};

		userData.token = JWTTestUtils.generateToken(userData);
		return userData;
	}

	/**
	 * Create HR manager test user
	 */
	static async createHRManager(overrides: Partial<TestUserData> = {}): Promise<TestUserData> {
		const id = nanoid();
		const userData: TestUserData = {
			id,
			email: `hr-${id}@test.com`,
			firstName: 'HR',
			lastName: 'Manager',
			role: UserRole.HR_MANAGER,
			permissions: ROLE_PERMISSIONS[UserRole.HR_MANAGER],
			createdAt: new Date().toISOString(),
			token: '',
			...overrides
		};

		userData.token = JWTTestUtils.generateToken(userData);
		return userData;
	}

	/**
	 * Create manager test user
	 */
	static async createManager(overrides: Partial<TestUserData> = {}): Promise<TestUserData> {
		const id = nanoid();
		const userData: TestUserData = {
			id,
			email: `manager-${id}@test.com`,
			firstName: 'Manager',
			lastName: 'User',
			role: UserRole.MANAGER,
			permissions: ROLE_PERMISSIONS[UserRole.MANAGER],
			createdAt: new Date().toISOString(),
			token: '',
			...overrides
		};

		userData.token = JWTTestUtils.generateToken(userData);
		return userData;
	}

	/**
	 * Create employee test user
	 */
	static async createEmployee(overrides: Partial<TestUserData> = {}): Promise<TestUserData> {
		const id = nanoid();
		const userData: TestUserData = {
			id,
			email: `employee-${id}@test.com`,
			firstName: 'Employee',
			lastName: 'User',
			role: UserRole.EMPLOYEE,
			permissions: ROLE_PERMISSIONS[UserRole.EMPLOYEE],
			createdAt: new Date().toISOString(),
			token: '',
			...overrides
		};

		userData.token = JWTTestUtils.generateToken(userData);
		return userData;
	}

	/**
	 * Create employee user with specific ID (for linking to existing employee records)
	 */
	static async createEmployeeWithId(
		employeeId: string,
		overrides: Partial<TestUserData> = {}
	): Promise<TestUserData> {
		const userData: TestUserData = {
			id: employeeId,
			email: `employee-${employeeId}@test.com`,
			firstName: 'Employee',
			lastName: 'User',
			role: UserRole.EMPLOYEE,
			permissions: ROLE_PERMISSIONS[UserRole.EMPLOYEE],
			createdAt: new Date().toISOString(),
			token: '',
			...overrides
		};

		userData.token = JWTTestUtils.generateToken(userData);
		return userData;
	}

	/**
	 * Create user with custom role and permissions
	 */
	static async createCustomUser(
		role: UserRole,
		permissions: Permission[],
		overrides: Partial<TestUserData> = {}
	): Promise<TestUserData> {
		const id = nanoid();
		const userData: TestUserData = {
			id,
			email: `custom-${id}@test.com`,
			firstName: 'Custom',
			lastName: 'User',
			role,
			permissions,
			createdAt: new Date().toISOString(),
			token: '',
			...overrides
		};

		userData.token = JWTTestUtils.generateToken(userData);
		return userData;
	}
}

// Test employee factory
export class TestEmployee {
	/**
	 * Create test employee record
	 */
	static async create(data: Partial<TestEmployeeData> = {}): Promise<TestEmployeeData> {
		const id = nanoid();
		const now = new Date().toISOString();

		return {
			id,
			firstName: 'Test',
			lastName: 'Employee',
			email: `employee-${id}@test.com`,
			role: UserRole.EMPLOYEE,
			departmentId: nanoid(),
			hireDate: now,
			status: 'ACTIVE',
			createdAt: now,
			updatedAt: now,
			...data
		};
	}

	/**
	 * Create multiple test employees
	 */
	static async createMany(
		count: number,
		baseData: Partial<TestEmployeeData> = {}
	): Promise<TestEmployeeData[]> {
		const employees: TestEmployeeData[] = [];

		for (let i = 0; i < count; i++) {
			const employee = await this.create({
				...baseData,
				firstName: `Employee${i}`,
				lastName: 'Test',
				email: `employee-${i}-${nanoid()}@test.com`
			});
			employees.push(employee);
		}

		return employees;
	}
}

// Test department factory
export class TestDepartment {
	/**
	 * Create test department
	 */
	static async create(data: Partial<TestDepartmentData> = {}): Promise<TestDepartmentData> {
		const id = nanoid();
		const now = new Date().toISOString();

		return {
			id,
			name: 'Test Department',
			description: 'Test department for integration tests',
			managerId: nanoid(),
			budget: 100000,
			createdAt: now,
			updatedAt: now,
			...data
		};
	}
}

// Database test utilities
export class DatabaseTestUtils {
	/**
	 * Setup test database connection
	 */
	static async setupTestDatabase(): Promise<void> {
		// Mock database setup for testing
		// In a real implementation, this would set up a test database connection
		console.log('Setting up test database...');
	}

	/**
	 * Clean up test database
	 */
	static async cleanupTestDatabase(): Promise<void> {
		// Mock database cleanup for testing
		console.log('Cleaning up test database...');
	}

	/**
	 * Execute raw SQL query (mocked)
	 */
	static async executeQuery(sql: string, params: any[] = []): Promise<any[]> {
		// Mock SQL execution
		console.log(`Executing SQL: ${sql}`, params);
		return [];
	}

	/**
	 * Truncate all test tables
	 */
	static async truncateAllTables(): Promise<void> {
		// Mock table truncation
		console.log('Truncating all test tables...');
	}

	/**
	 * Seed test data
	 */
	static async seedTestData(): Promise<TestContext> {
		const context = await createTestContext();
		console.log('Seeded test data:', Object.keys(context));
		return context;
	}
}

// Authentication test utilities
export class AuthTestUtils {
	/**
	 * Mock authentication middleware
	 */
	static mockAuthMiddleware = vi.fn((req: any, res: any, next: any) => {
		const token = req.headers.authorization?.replace('Bearer ', '');

		if (!token) {
			return res.status(401).json({ error: 'No token provided' });
		}

		try {
			const decoded = JWTTestUtils.verifyToken(token);
			req.user = decoded;
			next();
		} catch (error) {
			return res.status(401).json({ error: 'Invalid token' });
		}
	});

	/**
	 * Check if user has required permission
	 */
	static hasPermission(user: TestUserData, requiredPermission: Permission): boolean {
		return user.permissions.includes('*') || user.permissions.includes(requiredPermission);
	}

	/**
	 * Check if user role has sufficient level
	 */
	static hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
		return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
	}
}

// Test context management
export async function createTestContext(): Promise<TestContext> {
	// Create test users
	const admin = await TestUser.createAdmin();
	const hrManager = await TestUser.createHRManager();
	const manager = await TestUser.createManager();
	const employee = await TestUser.createEmployee();

	// Create test departments
	const engineering = await TestDepartment.create({
		name: 'Engineering',
		description: 'Software development team',
		managerId: manager.id
	});

	const marketing = await TestDepartment.create({
		name: 'Marketing',
		description: 'Marketing and communications team'
	});

	const hr = await TestDepartment.create({
		name: 'Human Resources',
		description: 'HR management team',
		managerId: hrManager.id
	});

	return {
		users: { admin, hrManager, manager, employee },
		departments: { engineering, marketing, hr },
		createdEmployees: [],
		createdUsers: [admin.id, hrManager.id, manager.id, employee.id],
		createdDepartments: [engineering.id, marketing.id, hr.id],
		createdReviews: [],
		createdGoals: [],
		createdLeaveRequests: []
	};
}

// Test cleanup utilities
export async function cleanupTestData(context: TestContext): Promise<void> {
	console.log('Cleaning up test data...');

	try {
		// Clean up in dependency order
		await Promise.all([
			// Clean up child records first
			...context.createdReviews.map((id) => cleanupRecord('performance_reviews', id)),
			...context.createdGoals.map((id) => cleanupRecord('goals', id)),
			...context.createdLeaveRequests.map((id) => cleanupRecord('leave_requests', id)),
			...context.createdEmployees.map((id) => cleanupRecord('employees', id))
		]);

		await Promise.all([
			// Clean up parent records
			...context.createdUsers.map((id) => cleanupRecord('users', id)),
			...context.createdDepartments.map((id) => cleanupRecord('departments', id))
		]);

		console.log('Test data cleanup completed');
	} catch (error) {
		console.error('Error during test cleanup:', error);
	}
}

// Helper function to clean up individual records
async function cleanupRecord(table: string, id: string): Promise<void> {
	// Mock record cleanup
	console.log(`Cleaning up ${table} record: ${id}`);
	// In real implementation, execute DELETE query
}

// Test data validation utilities
export class TestDataValidator {
	/**
	 * Validate UUID format
	 */
	static isValidUUID(value: string): boolean {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return uuidRegex.test(value);
	}

	/**
	 * Validate ISO date format
	 */
	static isValidISODate(value: string): boolean {
		const date = new Date(value);
		return !isNaN(date.getTime()) && date.toISOString() === value;
	}

	/**
	 * Validate email format
	 */
	static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * Validate performance rating range
	 */
	static isValidRating(rating: number): boolean {
		return rating >= 1 && rating <= 5;
	}

	/**
	 * Validate progress percentage
	 */
	static isValidProgress(progress: number): boolean {
		return progress >= 0 && progress <= 100;
	}
}

// Export all utilities
export * from './graphql-test-client';
export * from './performance-monitor';

// Default exports for convenience
export default {
	TestUser,
	TestEmployee,
	TestDepartment,
	JWTTestUtils,
	DatabaseTestUtils,
	AuthTestUtils,
	TestDataValidator,
	createTestContext,
	cleanupTestData,
	TEST_CONFIG,
	UserRole,
	ROLE_PERMISSIONS
};
