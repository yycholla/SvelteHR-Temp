/**
 * GraphQL Mock Server for Contract Testing
 * Provides mock implementations of GraphQL operations for TDD
 * This allows us to test the frontend GraphQL integration without a full backend
 */

import type { GraphQLResponse } from '../../tests/contract/auth.test';

interface MockUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	isActive: boolean;
	roles: MockRole[];
	employee?: MockEmployee;
}

interface MockRole {
	id: string;
	name: string;
	level: number;
	permissions?: MockPermission[];
}

interface MockPermission {
	resource: string;
	action: string;
	scope: string;
}

interface MockEmployee {
	id: string;
	employeeId: string;
	position: string;
	department: MockDepartment;
	manager?: MockEmployee;
	directReports: MockEmployee[];
	hireDate: string;
	status: string;
	salary?: number;
	phone?: string;
	address?: string;
	createdAt: string;
	updatedAt: string;
}

interface MockDepartment {
	id: string;
	name: string;
	description?: string;
}

/**
 * GraphQL Mock Server
 * Provides realistic mock responses for contract testing
 */
export class GraphQLMockServer {
	private users: MockUser[] = [];
	private employees: MockEmployee[] = [];
	private tokens: Map<string, { token: string; refreshToken: string; user: MockUser; expiresAt: string }> = new Map();

	constructor() {
		this.initializeMockData();
	}

	private initializeMockData() {
		// Initialize mock departments
		const departments: MockDepartment[] = [
			{ id: 'dept-1', name: 'Engineering', description: 'Software development team' },
			{ id: 'dept-2', name: 'Human Resources', description: 'HR management team' },
			{ id: 'dept-3', name: 'Sales', description: 'Sales and business development' }
		];

		// Initialize mock roles
		const roles: MockRole[] = [
			{ id: 'role-1', name: 'Admin', level: 100 },
			{ id: 'role-2', name: 'HR_Manager', level: 75 },
			{ id: 'role-3', name: 'Manager', level: 50 },
			{ id: 'role-4', name: 'Employee', level: 25 }
		];

		// Initialize mock permissions
		const permissions: MockPermission[] = [
			{ resource: 'employees', action: 'read', scope: 'allow' },
			{ resource: 'employees', action: 'write', scope: 'allow' },
			{ resource: 'employees', action: 'delete', scope: 'deny' }
		];

		// Add permissions to roles
		roles[0].permissions = permissions; // Admin has all permissions
		roles[1].permissions = [permissions[0], permissions[1]]; // HR Manager can read/write
		roles[2].permissions = [permissions[0]]; // Manager can read
		roles[3].permissions = []; // Employee has no special permissions

		// Initialize mock users
		this.users = [
			{
				id: 'user-1',
				email: 'admin@mountainhr.com',
				firstName: 'Admin',
				lastName: 'User',
				isActive: true,
				roles: [roles[0]]
			},
			{
				id: 'user-2',
				email: 'hr@mountainhr.com',
				firstName: 'HR',
				lastName: 'Manager',
				isActive: true,
				roles: [roles[1]]
			},
			{
				id: 'user-3',
				email: 'manager@mountainhr.com',
				firstName: 'Team',
				lastName: 'Manager',
				isActive: true,
				roles: [roles[2]]
			}
		];

		// Initialize mock employees
		this.employees = [
			{
				id: 'emp-1',
				employeeId: 'EMP001',
				position: 'System Administrator',
				department: departments[0],
				directReports: [],
				hireDate: '2023-01-01',
				status: 'ACTIVE',
				salary: 90000,
				phone: '+1-555-0001',
				address: '123 Admin St',
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: '2023-01-01T00:00:00Z'
			},
			{
				id: 'emp-2',
				employeeId: 'EMP002',
				position: 'HR Manager',
				department: departments[1],
				directReports: [],
				hireDate: '2023-02-01',
				status: 'ACTIVE',
				salary: 80000,
				phone: '+1-555-0002',
				address: '456 HR Ave',
				createdAt: '2023-02-01T00:00:00Z',
				updatedAt: '2023-02-01T00:00:00Z'
			},
			{
				id: 'emp-123',
				employeeId: 'EMP123',
				position: 'Test Employee',
				department: departments[2],
				directReports: [],
				hireDate: '2023-03-01',
				status: 'ACTIVE',
				salary: 70000,
				phone: '+1-555-0123',
				address: '789 Test St',
				createdAt: '2023-03-01T00:00:00Z',
				updatedAt: '2023-03-01T00:00:00Z'
			}
		];

		// Link users to employees
		this.users[0].employee = this.employees[0];
		this.users[1].employee = this.employees[1];
		this.users[2].employee = this.employees[0]; // Manager points to first employee for simplicity
	}

	/**
	 * Process GraphQL request and return appropriate mock response
	 */
	async request<T>(query: string, variables?: any): Promise<GraphQLResponse<T>> {
		const queryType = this.detectQueryType(query);
		
		console.log(`🧪 Mock GraphQL Request: ${queryType}`, { variables });

		try {
			switch (queryType) {
				case 'login':
					return this.handleLogin(variables) as Promise<GraphQLResponse<T>>;
				case 'me':
					return this.handleMe(variables) as Promise<GraphQLResponse<T>>;
				case 'refreshToken':
					return this.handleRefreshToken(variables) as Promise<GraphQLResponse<T>>;
				case 'dashboardStats':
					return this.handleDashboardStats(variables) as Promise<GraphQLResponse<T>>;
				case 'employeeCount':
					return this.handleEmployeeCount(variables) as Promise<GraphQLResponse<T>>;
				case 'employees':
					return this.handleEmployees(variables) as Promise<GraphQLResponse<T>>;
				case 'employee':
					return this.handleEmployee(variables) as Promise<GraphQLResponse<T>>;
				case 'employeeByEmployeeId':
					return this.handleEmployeeByEmployeeId(variables) as Promise<GraphQLResponse<T>>;
				case 'myProfile':
					return this.handleMyProfile(variables) as Promise<GraphQLResponse<T>>;
				case 'createEmployee':
					return this.handleCreateEmployee(variables) as Promise<GraphQLResponse<T>>;
				case 'updateEmployee':
					return this.handleUpdateEmployee(variables) as Promise<GraphQLResponse<T>>;
				case 'updateMyProfile':
					return this.handleUpdateMyProfile(variables) as Promise<GraphQLResponse<T>>;
				case 'deactivateEmployee':
					return this.handleDeactivateEmployee(variables) as Promise<GraphQLResponse<T>>;
				case 'reactivateEmployee':
					return this.handleReactivateEmployee(variables) as Promise<GraphQLResponse<T>>;
				case 'introspection':
					return this.handleIntrospection() as Promise<GraphQLResponse<T>>;
				default:
					return {
						errors: [{ message: `Unknown GraphQL operation: ${queryType}` }]
					};
			}
		} catch (error) {
			return {
				errors: [{ message: error instanceof Error ? error.message : 'Mock server error' }]
			};
		}
	}

	private detectQueryType(query: string): string {
		if (query.includes('mutation Login')) return 'login';
		if (query.includes('query Me')) return 'me';
		if (query.includes('mutation RefreshToken')) return 'refreshToken';
		if (query.includes('query DashboardStats')) return 'dashboardStats';
		if (query.includes('query EmployeeCount')) return 'employeeCount';
		if (query.includes('query Employees(')) return 'employees';
		if (query.includes('query Employee(')) return 'employee';
		if (query.includes('query EmployeeByEmployeeId')) return 'employeeByEmployeeId';
		if (query.includes('query MyProfile')) return 'myProfile';
		if (query.includes('mutation CreateEmployee')) return 'createEmployee';
		if (query.includes('mutation UpdateEmployee')) return 'updateEmployee';
		if (query.includes('mutation UpdateMyProfile')) return 'updateMyProfile';
		if (query.includes('mutation DeactivateEmployee')) return 'deactivateEmployee';
		if (query.includes('mutation ReactivateEmployee')) return 'reactivateEmployee';
		if (query.includes('__schema')) return 'introspection';
		return 'unknown';
	}

	private async handleLogin(variables: any): Promise<GraphQLResponse> {
		const { input } = variables;
		
		// Validate input
		if (!input || !input.email || !input.password) {
			return {
				errors: [{ message: 'Email and password are required' }]
			};
		}

		// Check credentials
		const user = this.users.find(u => u.email === input.email);
		if (!user || input.password !== 'admin123') {
			return {
				data: { login: null },
				errors: [{ message: 'Invalid credentials' }]
			};
		}

		// Generate tokens
		const token = `mock-token-${Date.now()}`;
		const refreshToken = `mock-refresh-${Date.now()}`;
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

		// Store token
		this.tokens.set(token, { token, refreshToken, user, expiresAt });

		return {
			data: {
				login: {
					token,
					refreshToken,
					user: {
						id: user.id,
						email: user.email,
						firstName: user.firstName,
						lastName: user.lastName,
						roles: user.roles.map(r => ({
							id: r.id,
							name: r.name,
							level: r.level
						}))
					},
					expiresAt
				}
			}
		};
	}

	private async handleMe(variables: any): Promise<GraphQLResponse> {
		// In the mock server, we need to simulate authentication
		// For contract testing, we'll assume authentication is required
		// Check for token passed from GraphQL client
		if (!variables || !variables._token) {
			return {
				data: { me: null },
				errors: [{ message: 'Unauthorized - authentication token required' }]
			};
		}

		// Validate the token - check if it's a valid mock token
		const token = variables._token;
		const tokenEntry = this.tokens.get(token);
		
		// If token is invalid (like 'invalid-token'), reject it
		if (!tokenEntry && !token.startsWith('mock-token-')) {
			return {
				data: { me: null },
				errors: [{ message: 'Unauthorized - invalid authentication token' }]
			};
		}

		// For testing purposes, return the first admin user when valid token is provided
		const user = tokenEntry ? tokenEntry.user : this.users[0];
		
		return {
			data: {
				me: {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					isActive: user.isActive,
					roles: user.roles.map(r => ({
						id: r.id,
						name: r.name,
						level: r.level,
						permissions: r.permissions?.map(p => ({
							resource: p.resource,
							action: p.action,
							scope: p.scope
						})) || []
					})),
					employee: user.employee ? {
						id: user.employee.id,
						employeeId: user.employee.employeeId,
						position: user.employee.position,
						department: {
							id: user.employee.department.id,
							name: user.employee.department.name
						}
					} : null
				}
			}
		};
	}

	private async handleRefreshToken(variables: any): Promise<GraphQLResponse> {
		const { refreshToken } = variables;
		
		if (!refreshToken) {
			return {
				errors: [{ message: 'Refresh token is required' }]
			};
		}

		// Find token entry
		const tokenEntry = Array.from(this.tokens.values()).find(t => t.refreshToken === refreshToken);
		if (!tokenEntry) {
			return {
				data: { refreshToken: null },
				errors: [{ message: 'Invalid refresh token' }]
			};
		}

		// Generate new tokens
		const newToken = `mock-token-${Date.now()}`;
		const newRefreshToken = `mock-refresh-${Date.now()}`;
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

		// Update token storage
		this.tokens.delete(tokenEntry.token);
		this.tokens.set(newToken, { 
			token: newToken, 
			refreshToken: newRefreshToken, 
			user: tokenEntry.user, 
			expiresAt 
		});

		return {
			data: {
				refreshToken: {
					token: newToken,
					refreshToken: newRefreshToken,
					expiresAt
				}
			}
		};
	}

	private async handleEmployees(variables: any): Promise<GraphQLResponse> {
		const { page = 1, limit = 20, search, department, status } = variables;

		// Validate enum values first (before authentication)
		if (status && !['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
			return {
				data: { employees: null },
				errors: [{ message: `Invalid EmployeeStatus enum value: ${status}` }]
			};
		}

		const { sortBy, sortOrder } = variables;
		if (sortBy && !['firstName', 'lastName', 'hireDate', 'position', 'FIRST_NAME', 'LAST_NAME', 'HIRE_DATE', 'POSITION'].includes(sortBy)) {
			return {
				data: { employees: null },
				errors: [{ message: `Invalid EmployeeSortField enum value: ${sortBy}` }]
			};
		}

		// Employees query always requires authentication
		if (!variables || !variables._token) {
			return {
				data: { employees: null },
				errors: [{ message: 'Unauthorized - authentication required for employee listing' }]
			};
		}

		// Validate the token - check if it's a valid mock token
		const token = variables._token;
		const tokenEntry = this.tokens.get(token);
		
		// If token is invalid, reject it
		if (!tokenEntry && !token.startsWith('mock-token-')) {
			return {
				data: { employees: null },
				errors: [{ message: 'Unauthorized - invalid authentication token' }]
			};
		}
		
		let filteredEmployees = [...this.employees];

		// Apply filters
		if (search) {
			const searchLower = search.toLowerCase();
			filteredEmployees = filteredEmployees.filter(emp =>
				emp.employeeId.toLowerCase().includes(searchLower) ||
				emp.position.toLowerCase().includes(searchLower)
			);
		}

		if (department) {
			filteredEmployees = filteredEmployees.filter(emp => emp.department.id === department);
		}

		if (status) {
			filteredEmployees = filteredEmployees.filter(emp => emp.status === status);
		}

		// Apply pagination
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

		return {
			data: {
				employees: {
					employees: paginatedEmployees.map(emp => ({
						id: emp.id,
						employeeId: emp.employeeId,
						user: {
							id: `user-${emp.id}`,
							email: `${emp.employeeId}@company.com`,
							firstName: emp.employeeId,
							lastName: 'Employee'
						},
						department: emp.department,
						position: emp.position,
						status: emp.status,
						hireDate: emp.hireDate,
						createdAt: emp.createdAt,
						updatedAt: emp.updatedAt
					})),
					total: filteredEmployees.length,
					page,
					limit,
					hasNextPage: endIndex < filteredEmployees.length,
					hasPreviousPage: page > 1
				}
			}
		};
	}

	private async handleEmployee(variables: any): Promise<GraphQLResponse> {
		const { id } = variables;
		
		// Validate ID format
		if (id && !id.match(/^emp-\d+$/)) {
			return {
				data: { employee: null },
				errors: [{ message: `Invalid ID format: ${id}` }]
			};
		}

		// Note: Basic employee lookup doesn't require authentication for contract testing
		const employee = this.employees.find(emp => emp.id === id);
		
		if (!employee) {
			return { data: { employee: null } };
		}

		return {
			data: {
				employee: {
					id: employee.id,
					employeeId: employee.employeeId,
					user: {
						id: `user-${employee.id}`,
						email: `${employee.employeeId}@company.com`,
						firstName: employee.employeeId,
						lastName: 'Employee',
						isActive: true
					},
					department: employee.department,
					position: employee.position,
					manager: employee.manager,
					directReports: employee.directReports,
					hireDate: employee.hireDate,
					status: employee.status,
					salary: employee.salary,
					phone: employee.phone,
					address: employee.address,
					createdAt: employee.createdAt,
					updatedAt: employee.updatedAt
				}
			}
		};
	}

	private async handleEmployeeByEmployeeId(variables: any): Promise<GraphQLResponse> {
		const { employeeId } = variables;
		const employee = this.employees.find(emp => emp.employeeId === employeeId);
		
		if (!employee) {
			return { data: { employeeByEmployeeId: null } };
		}

		return {
			data: {
				employeeByEmployeeId: {
					id: employee.id,
					employeeId: employee.employeeId,
					user: {
						id: `user-${employee.id}`,
						email: `${employee.employeeId}@company.com`,
						firstName: employee.employeeId,
						lastName: 'Employee'
					},
					department: employee.department,
					position: employee.position,
					status: employee.status
				}
			}
		};
	}

	private async handleMyProfile(variables: any): Promise<GraphQLResponse> {
		// myProfile should require authentication - check for token
		if (!variables || !variables._token) {
			return {
				data: { myProfile: null },
				errors: [{ message: 'Unauthorized - authentication required for profile access' }]
			};
		}

		// Validate the token
		const token = variables._token;
		const tokenEntry = this.tokens.get(token);
		
		if (!tokenEntry && !token.startsWith('mock-token-')) {
			return {
				data: { myProfile: null },
				errors: [{ message: 'Unauthorized - invalid authentication token' }]
			};
		}

		// Return first employee as mock current user profile
		const employee = this.employees[0];
		
		return {
			data: {
				myProfile: {
					id: employee.id,
					employeeId: employee.employeeId,
					user: {
						id: `user-${employee.id}`,
						email: `${employee.employeeId}@company.com`,
						firstName: employee.employeeId,
						lastName: 'Employee'
					},
					department: employee.department,
					position: employee.position,
					manager: employee.manager,
					hireDate: employee.hireDate,
					status: employee.status,
					phone: employee.phone,
					address: employee.address
				}
			}
		};
	}

	private async handleCreateEmployee(variables: any): Promise<GraphQLResponse> {
		// Check for authentication first
		if (!variables || !variables._token) {
			return {
				data: { createEmployee: null },
				errors: [{ message: 'Unauthorized - authentication required for employee creation' }]
			};
		}

		// Validate the token  
		const token = variables._token;
		const tokenEntry = this.tokens.get(token);
		
		if (!tokenEntry && !token.startsWith('mock-token-')) {
			return {
				data: { createEmployee: null },
				errors: [{ message: 'Unauthorized - insufficient permissions for employee creation' }]
			};
		}

		const { input } = variables;
		
		// Validate required fields
		if (!input.email || !input.firstName || !input.lastName || !input.employeeId) {
			return {
				errors: [{ message: 'Required fields missing' }]
			};
		}

		// Create new employee
		const newEmployee: MockEmployee = {
			id: `emp-${Date.now()}`,
			employeeId: input.employeeId,
			position: input.position,
			department: { id: input.departmentId, name: 'New Department' },
			directReports: [],
			hireDate: input.hireDate,
			status: 'ACTIVE',
			salary: input.salary,
			phone: input.phone,
			address: input.address,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		this.employees.push(newEmployee);

		return {
			data: {
				createEmployee: {
					id: newEmployee.id,
					employeeId: newEmployee.employeeId,
					user: {
						id: `user-${newEmployee.id}`,
						email: input.email,
						firstName: input.firstName,
						lastName: input.lastName
					},
					department: newEmployee.department,
					position: newEmployee.position,
					hireDate: newEmployee.hireDate,
					status: newEmployee.status,
					createdAt: newEmployee.createdAt,
					updatedAt: newEmployee.updatedAt
				}
			}
		};
	}

	private async handleUpdateEmployee(variables: any): Promise<GraphQLResponse> {
		const { id, input } = variables;
		const employee = this.employees.find(emp => emp.id === id);
		
		if (!employee) {
			return {
				errors: [{ message: 'Employee not found' }]
			};
		}

		// Update employee fields
		if (input.position) employee.position = input.position;
		if (input.salary) employee.salary = input.salary;
		if (input.phone) employee.phone = input.phone;
		if (input.address) employee.address = input.address;
		employee.updatedAt = new Date().toISOString();

		return {
			data: {
				updateEmployee: {
					id: employee.id,
					employeeId: employee.employeeId,
					user: {
						firstName: input.firstName || 'Updated',
						lastName: input.lastName || 'Employee'
					},
					department: employee.department,
					position: employee.position,
					salary: employee.salary,
					phone: employee.phone,
					address: employee.address,
					updatedAt: employee.updatedAt
				}
			}
		};
	}

	private async handleUpdateMyProfile(variables: any): Promise<GraphQLResponse> {
		const { input } = variables;
		const employee = this.employees[0]; // Use first employee as current user
		
		if (input.phone) employee.phone = input.phone;
		if (input.address) employee.address = input.address;
		employee.updatedAt = new Date().toISOString();

		return {
			data: {
				updateMyProfile: {
					id: employee.id,
					employeeId: employee.employeeId,
					phone: employee.phone,
					address: employee.address,
					updatedAt: employee.updatedAt
				}
			}
		};
	}

	private async handleDeactivateEmployee(variables: any): Promise<GraphQLResponse> {
		const { id } = variables;
		const employee = this.employees.find(emp => emp.id === id);
		
		if (!employee) {
			return {
				errors: [{ message: 'Employee not found' }]
			};
		}

		employee.status = 'INACTIVE';
		employee.updatedAt = new Date().toISOString();

		return {
			data: {
				deactivateEmployee: {
					id: employee.id,
					employeeId: employee.employeeId,
					status: employee.status,
					updatedAt: employee.updatedAt
				}
			}
		};
	}

	private async handleReactivateEmployee(variables: any): Promise<GraphQLResponse> {
		const { id } = variables;
		const employee = this.employees.find(emp => emp.id === id);
		
		if (!employee) {
			return {
				errors: [{ message: 'Employee not found' }]
			};
		}

		employee.status = 'ACTIVE';
		employee.updatedAt = new Date().toISOString();

		return {
			data: {
				reactivateEmployee: {
					id: employee.id,
					employeeId: employee.employeeId,
					status: employee.status,
					updatedAt: employee.updatedAt
				}
			}
		};
	}

	private async handleDashboardStats(variables: any): Promise<GraphQLResponse> {
		// Dashboard stats always require authentication
		if (!variables || !variables._token) {
			return {
				data: { dashboardStats: null },
				errors: [{ message: 'Unauthorized - authentication required for dashboard stats' }]
			};
		}

		// Validate the token
		const token = variables._token;
		const tokenEntry = this.tokens.get(token);
		
		if (!tokenEntry && !token.startsWith('mock-token-')) {
			return {
				data: { dashboardStats: null },
				errors: [{ message: 'Unauthorized - invalid authentication token' }]
			};
		}

		const { userRole = 'Employee' } = variables;

		// Generate role-based mock dashboard stats
		const baseStats = {
			personalStats: {
				totalEmployees: this.employees.length,
				newEmployeesThisMonth: Math.floor(Math.random() * 5) + 1,
				pendingTasks: Math.floor(Math.random() * 10) + 2,
				availableTimeOff: Math.floor(Math.random() * 15) + 10,
				myTasks: Math.floor(Math.random() * 8) + 3,
				myPendingLeave: Math.floor(Math.random() * 3)
			},
			teamStats: userRole === 'Manager' || userRole === 'HR' || userRole === 'Admin' ? {
				teamSize: Math.floor(Math.random() * 20) + 5,
				teamTasksCompleted: Math.floor(Math.random() * 50) + 20,
				teamPendingApprovals: Math.floor(Math.random() * 8) + 2,
				teamPerformanceScore: Math.floor(Math.random() * 20) + 80
			} : {
				teamSize: 0,
				teamTasksCompleted: 0,
				teamPendingApprovals: 0,
				teamPerformanceScore: 0
			},
			systemStats: userRole === 'Admin' ? {
				apiRequestCount: Math.floor(Math.random() * 10000) + 5000,
				averageLatency: Math.floor(Math.random() * 100) + 50,
				errorRate: Math.random() * 2,
				activeConnections: Math.floor(Math.random() * 100) + 20,
				systemUptime: Math.floor(Math.random() * 30) + 20
			} : {
				apiRequestCount: 0,
				averageLatency: 0,
				errorRate: 0,
				activeConnections: 0,
				systemUptime: 0
			},
			hrStats: userRole === 'HR' || userRole === 'Admin' ? {
				totalEmployees: this.employees.length,
				complianceItems: Math.floor(Math.random() * 15) + 5,
				leaveRequests: Math.floor(Math.random() * 12) + 3,
				hrRequests: Math.floor(Math.random() * 8) + 2
			} : {
				totalEmployees: 0,
				complianceItems: 0,
				leaveRequests: 0,
				hrRequests: 0
			},
			recentActivities: [
				{
					id: 1,
					type: 'system',
					message: `Welcome to your ${userRole} dashboard!`,
					time: 'Just now',
					avatar: 'SYS'
				},
				{
					id: 2,
					type: 'employee',
					message: 'New employee onboarding completed',
					time: '2 hours ago',
					avatar: 'HR'
				},
				{
					id: 3,
					type: 'task',
					message: 'Team task assigned',
					time: '4 hours ago',
					avatar: 'MGR'
				}
			],
			upcomingEvents: [
				{
					id: 1,
					title: 'Team Meeting',
					date: new Date(Date.now() + 86400000).toISOString(),
					attendees: Math.floor(Math.random() * 15) + 5,
					type: 'meeting'
				},
				{
					id: 2,
					title: 'HR Training',
					date: new Date(Date.now() + 172800000).toISOString(),
					attendees: Math.floor(Math.random() * 25) + 10,
					type: 'training'
				}
			],
			notifications: Math.floor(Math.random() * 5) + 1
		};

		return {
			data: {
				dashboardStats: baseStats
			}
		};
	}

	private async handleEmployeeCount(variables: any): Promise<GraphQLResponse> {
		// Employee count always requires authentication
		if (!variables || !variables._token) {
			return {
				data: { employeeCount: null },
				errors: [{ message: 'Unauthorized - authentication required for employee count' }]
			};
		}

		// Validate the token
		const token = variables._token;
		const tokenEntry = this.tokens.get(token);
		
		if (!tokenEntry && !token.startsWith('mock-token-')) {
			return {
				data: { employeeCount: null },
				errors: [{ message: 'Unauthorized - invalid authentication token' }]
			};
		}

		return {
			data: {
				employeeCount: {
					total: this.employees.length,
					active: this.employees.filter(emp => emp.status === 'ACTIVE').length,
					newThisMonth: Math.floor(Math.random() * 5) + 1
				}
			}
		};
	}

	private async handleIntrospection(): Promise<GraphQLResponse> {
		return {
			data: {
				__schema: {
					types: [
						{ name: 'User', kind: 'OBJECT' },
						{ name: 'Employee', kind: 'OBJECT' },
						{ name: 'Query', kind: 'OBJECT' },
						{ name: 'Mutation', kind: 'OBJECT' }
					],
					queryType: { name: 'Query' },
					mutationType: { name: 'Mutation' }
				}
			}
		};
	}
}

// Export singleton instance for use in tests
export const mockGraphQLServer = new GraphQLMockServer();