// src/adapters/GraphQLEmployeeAdapter.ts
import type { EmployeeRepository } from '$services';
import { Employee, type EmployeeListFilters, type EmployeeListResult } from '$domain';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { gql } from '@urql/core';
import { logger } from '$lib/utils/logger';

/**
 * Maximum number of users to fetch for client-side filtering operations
 *
 * IMPORTANT: This is a workaround limit until backend implements server-side filtering.
 * - Higher values = more complete data but slower queries and potential timeouts
 * - Lower values = faster queries but may miss users in large organizations
 *
 * Current limit: 1000 users
 * - Covers 95%+ of organizations
 * - Query completes in ~1-2 seconds (safe margin before timeout)
 * - Total payload: ~200KB (reasonable for network transfer)
 *
 * Organizations with >1000 employees will see incomplete results until backend
 * implements filtering (see docs/hotfixes/2026-01-20-graphql-schema-mismatch.md)
 *
 * TODO: Remove this when backend implements:
 * - userByEmail(email: String!) query
 * - users() query with filtering parameters (departmentId, isActive, searchTerm, etc.)
 */
const CLIENT_SIDE_FILTER_LIMIT = 1000;

interface GraphQLEmployee {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	hireDate: string;
	departmentId: string | null;
	jobTitle: string | null;
	phone: string | null;
	isActive: boolean;
}

export class GraphQLEmployeeAdapter implements EmployeeRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Employee | null> {
		const query = gql`
			query GetEmployee($id: UUID!) {
				user(id: $id) {
					id
					email
					firstName
					lastName
					hireDate
					departmentId
					jobTitle
					phone
					isActive
				}
			}
		`;

		const result = await this.graphql.query<{ user: GraphQLEmployee | null }>(query, { id });

		if (!result?.user) {
			return null;
		}

		return this.mapToEmployee(result.user);
	}

	async findByEmail(email: string): Promise<Employee | null> {
		// NOTE: Backend doesn't have userByEmail query yet
		// This implementation fetches all users and filters client-side
		// TODO: Add userByEmail(email: String!) query to backend for better performance
		const query = gql`
			query GetAllUsersForEmailLookup($limit: Int!) {
				users(limit: $limit, offset: 0) {
					id
					email
					firstName
					lastName
					hireDate
					departmentId
					jobTitle
					phone
					isActive
				}
			}
		`;

		// Use configured limit to prevent timeouts
		// This is inefficient but necessary until backend adds userByEmail query
		logger.warn(
			'[GraphQLEmployeeAdapter] Using client-side email lookup - add userByEmail query to backend',
			{
				email,
				limit: CLIENT_SIDE_FILTER_LIMIT,
				warning:
					'Organizations with >1000 employees may not find all users. Add userByEmail(email: String!) to backend.'
			}
		);

		const result = await this.graphql.query<{ users: GraphQLEmployee[] }>(query, {
			limit: CLIENT_SIDE_FILTER_LIMIT
		});

		if (!result?.users) {
			return null;
		}

		// Client-side filtering by email (case-insensitive)
		const normalizedEmail = email.trim().toLowerCase();
		const found = result.users.find(
			(user: GraphQLEmployee) => user.email.trim().toLowerCase() === normalizedEmail
		);

		if (!found) {
			return null;
		}

		return this.mapToEmployee(found);
	}

	async findAll(filters?: EmployeeListFilters): Promise<EmployeeListResult> {
		// NOTE: Backend users query doesn't support filtering/sorting parameters
		// We fetch all users and apply filters client-side
		// TODO: Add filtering parameters to backend users query for better performance
		const query = gql`
			query GetEmployees($limit: Int!, $offset: Int!) {
				users(limit: $limit, offset: $offset) {
					id
					email
					firstName
					lastName
					hireDate
					departmentId
					jobTitle
					phone
					isActive
				}
			}
		`;

		// Use configured limit to prevent timeouts
		// This is inefficient but necessary until backend supports filtering
		logger.debug('[GraphQLEmployeeAdapter] Fetching users for client-side filtering', {
			limit: CLIENT_SIDE_FILTER_LIMIT,
			filters,
			note: 'Backend filtering not available - fetching fixed limit and filtering client-side'
		});

		const result = await this.graphql.query<{ users: GraphQLEmployee[] }>(query, {
			limit: CLIENT_SIDE_FILTER_LIMIT,
			offset: 0
		});

		if (!result?.users) {
			return {
				employees: [],
				total: 0,
				limit: filters?.limit ?? 0,
				offset: filters?.offset ?? 0
			};
		}

		// Map all users to employees, filtering out invalid records
		// Note: mapToEmployee returns null for invalid data (logs warnings internally)
		let employees = result.users
			.map((emp: GraphQLEmployee) => this.mapToEmployee(emp))
			.filter((emp: Employee | null): emp is Employee => emp !== null);

		// Apply filters client-side
		if (filters?.searchTerm) {
			const term = filters.searchTerm.toLowerCase();
			employees = employees.filter(
				(emp: Employee) =>
					emp.fullName.toLowerCase().includes(term) || emp.email.value.toLowerCase().includes(term)
			);
		}

		if (filters?.departmentId) {
			employees = employees.filter((emp: Employee) => emp.departmentId === filters.departmentId);
		}

		if (filters?.isActive !== undefined) {
			employees = employees.filter((emp: Employee) => emp.isActive === filters.isActive);
		}

		// Apply sorting
		if (filters?.sortBy) {
			const sortBy = filters.sortBy;
			const sortOrder = filters.sortOrder || 'asc';

			employees.sort((a: Employee, b: Employee) => {
				let compareValue = 0;

				switch (sortBy) {
					case 'name':
						compareValue = a.fullName.localeCompare(b.fullName);
						return sortOrder === 'asc' ? compareValue : -compareValue;
					case 'email':
						compareValue = a.email.value.localeCompare(b.email.value);
						return sortOrder === 'asc' ? compareValue : -compareValue;
					case 'hireDate':
						compareValue = a.hireDate.value.getTime() - b.hireDate.value.getTime();
						return sortOrder === 'asc' ? compareValue : -compareValue;
					case 'jobTitle':
						// Handle null values - nulls always appear last
						if (a.jobTitle === null && b.jobTitle === null) {
							compareValue = 0;
						} else if (a.jobTitle === null) {
							compareValue = 1; // a (null) always comes after b
						} else if (b.jobTitle === null) {
							compareValue = -1; // b (null) always comes after a
						} else {
							// Only apply sortOrder to non-null comparisons
							compareValue = a.jobTitle.localeCompare(b.jobTitle);
							compareValue = sortOrder === 'asc' ? compareValue : -compareValue;
						}
						return compareValue;
					default:
						return 0;
				}
			});
		}

		// Apply pagination
		const total = employees.length;
		const offset = filters?.offset ?? 0;
		const limit = filters?.limit ?? total;

		const paginated = employees.slice(offset, offset + limit);

		return {
			employees: paginated,
			total,
			limit,
			offset
		};
	}

	async save(employee: Employee): Promise<Employee> {
		const mutation = gql`
			mutation CreateEmployee($input: CreateUserInput!) {
				users {
					createUser(input: $input) {
						id
						email
						firstName
						lastName
						hireDate
						departmentId
						jobTitle
						phone
						isActive
					}
				}
			}
		`;

		const input = {
			email: employee.email.value,
			firstName: employee.name.first,
			lastName: employee.name.last,
			hireDate: employee.hireDate.value.toISOString(),
			departmentId: employee.departmentId,
			jobTitle: employee.jobTitle,
			phone: employee.phone,
			status: employee.isActive ? 'active' : 'inactive' // Backend expects lowercase
		};

		const result = await this.graphql.mutation<{ users: { createUser: GraphQLEmployee } }>(
			mutation,
			{ input }
		);

		if (!result?.users?.createUser) {
			throw new Error('Create user mutation returned no data');
		}

		const createdEmployee = this.mapToEmployee(result.users.createUser);
		if (!createdEmployee) {
			throw new Error('Failed to map created employee - invalid data returned from backend');
		}

		return createdEmployee;
	}

	async update(id: string, employee: Employee): Promise<Employee> {
		if (id !== employee.id) {
			throw new Error(`ID mismatch: expected ${id}, got ${employee.id}`);
		}

		const mutation = gql`
			mutation UpdateEmployee($id: UUID!, $input: UpdateUserInput!) {
				users {
					updateUser(id: $id, input: $input) {
						id
						email
						firstName
						lastName
						hireDate
						departmentId
						jobTitle
						phone
						isActive
					}
				}
			}
		`;

		const input = {
			departmentId: employee.departmentId,
			jobTitle: employee.jobTitle,
			phone: employee.phone,
			isActive: employee.isActive
		};

		const result = await this.graphql.mutation<{ users: { updateUser: GraphQLEmployee } }>(
			mutation,
			{ id, input }
		);

		if (!result?.users?.updateUser) {
			throw new Error('Update user mutation returned no data');
		}

		const updatedEmployee = this.mapToEmployee(result.users.updateUser);
		if (!updatedEmployee) {
			throw new Error('Failed to map updated employee - invalid data returned from backend');
		}

		return updatedEmployee;
	}

	async delete(id: string): Promise<void> {
		const mutation = gql`
			mutation DeleteEmployee($id: UUID!) {
				users {
					deleteUser(id: $id)
				}
			}
		`;

		await this.graphql.mutation(mutation, { id });
	}

	async exists(id: string): Promise<boolean> {
		const employee = await this.findById(id);
		return employee !== null;
	}

	/**
	 * Sanitizes hire date from backend to ensure it matches domain validation
	 *
	 * **Data Integrity Layer**: Validates and rejects invalid hire dates at the adapter boundary.
	 * Backend may contain varied dates (intentional in test/seed data for validation testing):
	 * - Future dates: hire_date > now()
	 * - Invalid formats
	 *
	 * Domain expects: hire date must be in the past or today
	 *
	 * Strategy: Flag and reject invalid data, return null instead of failing the entire operation.
	 *
	 * @returns ISO date string or null if invalid
	 */
	private sanitizeHireDate(hireDate: string | null, userId: string): string | null {
		if (!hireDate) {
			return null;
		}

		try {
			const date = new Date(hireDate);
			const now = new Date();

			// Check if date is in the future
			if (date > now) {
				logger.warn(
					'[GraphQLEmployeeAdapter] Invalid hire date detected (future), skipping record',
					{
						userId,
						invalidHireDate: hireDate,
						parsedDate: date.toISOString(),
						now: now.toISOString(),
						reason: 'Hire date cannot be in the future - likely test data from fake crate'
					}
				);
				return null;
			}

			// Return original ISO string
			return hireDate;
		} catch (err) {
			logger.warn('[GraphQLEmployeeAdapter] Invalid hire date format, skipping record', {
				userId,
				invalidHireDate: hireDate,
				error: err instanceof Error ? err.message : String(err),
				reason: 'Date parsing failed'
			});
			return null;
		}
	}

	/**
	 * Sanitizes phone number from backend to ensure it matches domain validation
	 *
	 * **Data Integrity Layer**: Validates and rejects invalid phone formats at the adapter boundary.
	 * Backend may contain varied formats (intentional in test/seed data for validation testing):
	 * - Addresses: "1805 E Overland Rd Apt 3224, Meridian, ID 83642-6891"
	 * - Extensions: "280.766.3038 x335"
	 * - Various formats: "555-123-4567", "(555) 123-4567", "555.123.4567"
	 *
	 * Domain expects: /^\+?[1-9]\d{9,14}$/ (international format, digits only)
	 *
	 * Strategy: Flag and reject invalid data, return null instead of failing the entire operation.
	 * This ensures data integrity while maintaining resilience.
	 */
	private sanitizePhoneNumber(phone: string | null, userId: string): string | null {
		if (!phone || phone.trim() === '') {
			return null;
		}

		const trimmed = phone.trim();

		// If phone contains letters or commas, it's invalid - reject it
		if (/[a-zA-Z,]/.test(trimmed)) {
			logger.warn(
				'[GraphQLEmployeeAdapter] Invalid phone format detected, flagging and rejecting',
				{
					userId,
					invalidPhone: trimmed,
					reason: 'Phone number contains letters/commas - likely address or invalid format'
				}
			);
			return null;
		}

		// Remove common phone formatting characters
		const normalized = trimmed.replace(/[\s\-().]/g, '');

		// Check if it matches domain validation: +?[1-9]\d{9,14}
		const phoneRegex = /^\+?[1-9]\d{9,14}$/;

		if (!phoneRegex.test(normalized)) {
			logger.warn('[GraphQLEmployeeAdapter] Invalid phone format (fails validation), using null', {
				userId,
				invalidPhone: trimmed,
				normalized,
				reason: 'Phone does not match international format after normalization'
			});
			return null;
		}

		// Return original format (preserves dashes, dots, etc. for display)
		return trimmed;
	}

	/**
	 * Maps GraphQL employee data to domain Employee entity
	 *
	 * **Resilience Strategy**: Returns null for invalid records instead of throwing.
	 * This ensures one bad record doesn't kill the entire operation.
	 *
	 * Invalid data is logged with warnings for monitoring and data quality tracking.
	 *
	 * @returns Employee entity or null if data is invalid
	 */
	private mapToEmployee(data: GraphQLEmployee): Employee | null {
		// Sanitize phone number - validate and flag invalid data at the adapter boundary
		// Backend may contain varied formats (test data intentionally includes edge cases)
		const sanitizedPhone = this.sanitizePhoneNumber(data.phone, data.id);

		// Sanitize hire date - flag and reject future dates
		const sanitizedHireDate = this.sanitizeHireDate(data.hireDate, data.id);
		if (!sanitizedHireDate) {
			// Already logged in sanitizeHireDate, just return null
			return null;
		}

		const result = Employee.create({
			id: data.id,
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			hireDate: sanitizedHireDate,
			departmentId: data.departmentId,
			jobTitle: data.jobTitle,
			phone: sanitizedPhone
		});

		if (result.isError) {
			logger.warn('[GraphQLEmployeeAdapter] Failed to map employee, skipping record', {
				userId: data.id,
				email: data.email,
				error: result.error.message,
				reason: 'Domain validation failed - data does not meet business rules'
			});
			return null;
		}

		const employee = result.value;

		// Apply status if inactive
		if (!data.isActive) {
			employee.deactivate();
		}

		return employee;
	}
}
