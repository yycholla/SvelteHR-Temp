// src/adapters/GraphQLEmployeeAdapter.ts
import type { EmployeeRepository, EmployeeStatistics } from '$services';
import { Employee, type EmployeeListFilters, type EmployeeListResult } from '$domain';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { gql } from '@urql/core';
import { logger } from '$lib/utils/logger';

/**
 * Backend filter input for the users query
 */
interface UserFilter {
	searchTerm?: string;
	departmentId?: string;
	isActive?: boolean;
}

/**
 * Backend sort input for the users query
 */
interface UserSort {
	field: string;
	direction: 'asc' | 'desc';
}

interface GraphQLRole {
	id: string;
	name: string;
}

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
	roles?: GraphQLRole[];
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
					roles {
						id
						name
					}
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
		const query = gql`
			query GetUserByEmail($email: String!) {
				userByEmail(email: $email) {
					id
					email
					firstName
					lastName
					hireDate
					departmentId
					jobTitle
					phone
					isActive
					roles {
						id
						name
					}
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ userByEmail: GraphQLEmployee | null }>(query, {
				email: email.toLowerCase()
			});

			const userData = result?.userByEmail;
			if (!userData) {
				return null;
			}

			return this.mapToEmployee(userData);
		} catch (error) {
			logger.error(
				'[GraphQLEmployeeAdapter] Exception in findByEmail',
				error instanceof Error ? error : undefined,
				{ email }
			);
			return null;
		}
	}

	async findAll(filters?: EmployeeListFilters): Promise<EmployeeListResult> {
		// NOTE: Current GraphQL schema only supports limit/offset, not filter/sort
		// Filtering and sorting will be done client-side for now
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
					roles {
						id
						name
					}
				}
			}
		`;

		// Use large limit to fetch all users for client-side filtering
		// TODO: Once backend supports filter/sort, update this to use server-side filtering
		const limit = filters?.limit ?? 1000; // Fetch more for client-side filtering
		const offset = filters?.offset ?? 0;

		logger.debug('[GraphQLEmployeeAdapter] Fetching users (client-side filtering)', {
			requestedLimit: filters?.limit,
			limit,
			offset,
			filters: filters
		});

		const result = await this.graphql.query<{ users: GraphQLEmployee[] }>(query, {
			limit,
			offset
		});

		if (!result?.users) {
			return {
				employees: [],
				total: 0,
				limit: filters?.limit ?? 20,
				offset
			};
		}

		// Map all users to employees, filtering out invalid records
		// Note: mapToEmployee returns null for invalid data (logs warnings internally)
		let employees = result.users
			.map((emp: GraphQLEmployee) => this.mapToEmployee(emp))
			.filter((emp: Employee | null): emp is Employee => emp !== null);

		// Apply client-side filtering
		if (filters) {
			// Filter by search term
			if (filters.searchTerm) {
				const searchLower = filters.searchTerm.toLowerCase();
				employees = employees.filter((emp) => {
					return (
						emp.email.value.toLowerCase().includes(searchLower) ||
						emp.name.first.toLowerCase().includes(searchLower) ||
						emp.name.last.toLowerCase().includes(searchLower) ||
						emp.fullName.toLowerCase().includes(searchLower)
					);
				});
			}

			// Filter by department
			if (filters.departmentId) {
				employees = employees.filter((emp) => emp.departmentId === filters.departmentId);
			}

			// Filter by active status
			if (filters.isActive !== undefined) {
				employees = employees.filter((emp) => emp.isActive === filters.isActive);
			}

			// Apply sorting
			if (filters.sortBy) {
				const sortOrder = filters.sortOrder ?? 'asc';
				employees.sort((a, b) => {
					let aVal: string | Date;
					let bVal: string | Date;

					switch (filters.sortBy) {
						case 'name':
							aVal = a.fullName;
							bVal = b.fullName;
							break;
						case 'email':
							aVal = a.email.value;
							bVal = b.email.value;
							break;
						case 'hireDate':
							aVal = a.hireDate.value;
							bVal = b.hireDate.value;
							break;
						case 'jobTitle':
							aVal = a.jobTitle ?? '';
							bVal = b.jobTitle ?? '';
							break;
						default:
							return 0;
					}

					if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
					if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
					return 0;
				});
			}
		}

		const total = employees.length;
		const requestedLimit = filters?.limit ?? 20;

		// Apply pagination after filtering/sorting
		const paginatedEmployees = employees.slice(offset, offset + requestedLimit);

		return {
			employees: paginatedEmployees,
			total,
			limit: requestedLimit,
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

	async getStatistics(): Promise<EmployeeStatistics> {
		// TODO: Fix employeeStatistics GraphQL schema mismatch
		// Current backend schema doesn't match expected fields
		// For now, return empty statistics to unblock employee list display
		logger.warn('[GraphQLEmployeeAdapter] getStatistics disabled due to schema mismatch');
		return { total: 0, active: 0, inactive: 0, byDepartment: [] };
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

		// Map roles from GraphQL response
		const roles = (data.roles ?? []).map((r) => ({ id: r.id, name: r.name }));

		const result = Employee.create({
			id: data.id,
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			hireDate: sanitizedHireDate,
			departmentId: data.departmentId,
			jobTitle: data.jobTitle,
			phone: sanitizedPhone,
			roles
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
