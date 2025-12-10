// GraphQL Operations: Team Management
// Created: 2025-09-24
// Task: T011 - Team management GraphQL operations for /dashboard/teams

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { Department } from '$lib/types/domain-extensions';
import type { PaginationInput, SortInput, User } from '$lib/types/index';

// Query: Get all teams/departments with statistics
export const GET_ALL_TEAMS = gql`
	query GetAllTeams(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [DepartmentsOrderBy!] = [NAME_ASC]
		$filter: DepartmentFilter
	) {
		departments(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				subDepartments: departmentsByParentDepartmentId {
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
`;

// Query: Get single team/department by ID with detailed information
export const GET_TEAM_DETAILS = gql`
	query GetTeamDetails($id: UUID!) {
		department(id: $id) {
			id
			name
			description
			parentDepartmentId
			parentDepartment {
				id
				name
			}
			departmentHead {
				id
				displayName
				email
				jobTitle
				phone
			}
			employees {
				nodes {
					id
					displayName
					email
					jobTitle
					isActive
					hireDate
					managerId
				}
				totalCount
			}
			activeEmployees: employees(condition: { isActive: true }) {
				totalCount
			}
			subDepartments: departmentsByParentDepartmentId {
				nodes {
					id
					name
					description
					employeeCount: employees {
						totalCount
					}
				}
				totalCount
			}
			createdAt
			updatedAt
		}
	}
`;

// Query: Get team hierarchy for org chart visualization
export const GET_TEAM_HIERARCHY = gql`
	query GetTeamHierarchy($rootDepartmentId: UUID) {
		departments(condition: { parentDepartmentId: $rootDepartmentId }, orderBy: [NAME_ASC]) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				subDepartments: departmentsByParentDepartmentId {
					nodes {
						id
						name
						employeeCount: employees {
							totalCount
						}
					}
				}
			}
		}
	}
`;

// Query: Search teams with advanced filtering
export const SEARCH_TEAMS = gql`
	query SearchTeams(
		$filter: DepartmentFilter
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [DepartmentsOrderBy!] = [NAME_ASC]
	) {
		departments(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
		}
	}
`;

// Mutation: Create new team/department
export const CREATE_TEAM = gql`
	mutation CreateTeam($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			department {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
				createdAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update team/department
export const UPDATE_TEAM = gql`
	mutation UpdateTeam($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Delete team/department
export const DELETE_TEAM = gql`
	mutation DeleteTeam($input: DeleteDepartmentInput!) {
		deleteDepartment(input: $input) {
			deletedDepartmentId
			clientMutationId
		}
	}
`;

// Mutation: Assign department head
export const ASSIGN_DEPARTMENT_HEAD = gql`
	mutation AssignDepartmentHead($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Move employee to different team
export const MOVE_EMPLOYEE_TO_TEAM = gql`
	mutation MoveEmployeeToTeam($input: UpdateUserInput!) {
		updateUser(input: $input) {
			user {
				id
				displayName
				department {
					id
					name
				}
				updatedAt
			}
			clientMutationId
		}
	}
`;

// TypeScript interfaces for inputs
export interface CreateDepartmentInput {
	clientMutationId?: string;
	department: {
		name: string;
		description?: string;
		parentDepartmentId?: string;
		departmentHeadId?: string;
	};
}

export interface UpdateDepartmentInput {
	clientMutationId?: string;
	id: string;
	patch: {
		name?: string;
		description?: string;
		parentDepartmentId?: string;
		departmentHeadId?: string;
	};
}

export interface DeleteDepartmentInput {
	clientMutationId?: string;
	id: string;
}

export interface MoveEmployeeInput {
	clientMutationId?: string;
	id: string;
	patch: {
		departmentId?: string;
		managerId?: string;
	};
}

export interface DepartmentFilter {
	name?: {
		includesInsensitive?: string;
		equalTo?: string;
	};
	parentDepartmentId?: {
		equalTo?: string;
		isNull?: boolean;
	};
	departmentHeadId?: {
		equalTo?: string;
		isNull?: boolean;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

export interface TeamSearchFilter {
	searchTerm?: string;
	parentDepartmentId?: string;
	departmentHeadId?: string;
	hasEmployees?: boolean;
	isActive?: boolean;
}

// Utility functions for team management
export const teamSizeCategories = [
	{ value: 'small', label: 'Small (1-5)', min: 1, max: 5, color: 'green' },
	{ value: 'medium', label: 'Medium (6-15)', min: 6, max: 15, color: 'blue' },
	{ value: 'large', label: 'Large (16-30)', min: 16, max: 30, color: 'orange' },
	{ value: 'enterprise', label: 'Enterprise (31+)', min: 31, max: 999, color: 'purple' }
];

export const departmentTypes = [
	{ value: 'engineering', label: 'Engineering', icon: 'code', color: 'blue' },
	{ value: 'sales', label: 'Sales', icon: 'trending-up', color: 'green' },
	{ value: 'marketing', label: 'Marketing', icon: 'megaphone', color: 'pink' },
	{ value: 'hr', label: 'Human Resources', icon: 'users', color: 'purple' },
	{ value: 'finance', label: 'Finance', icon: 'dollar-sign', color: 'yellow' },
	{ value: 'operations', label: 'Operations', icon: 'settings', color: 'gray' },
	{ value: 'support', label: 'Support', icon: 'help-circle', color: 'cyan' },
	{ value: 'design', label: 'Design', icon: 'palette', color: 'orange' },
	{ value: 'legal', label: 'Legal', icon: 'shield', color: 'red' },
	{ value: 'executive', label: 'Executive', icon: 'crown', color: 'gold' }
];

// Helper function to categorize team size
export function categorizeTeamSize(employeeCount: number): (typeof teamSizeCategories)[0] {
	// Handle empty teams
	if (employeeCount === 0) {
		return { value: 'empty', label: 'Empty (0)', min: 0, max: 0, color: 'gray' };
	}

	// Find matching category or return enterprise for very large teams
	const match = teamSizeCategories.find(
		(cat) => employeeCount >= cat.min && employeeCount <= cat.max
	);
	return match || teamSizeCategories[teamSizeCategories.length - 1]; // Default to enterprise for 1000+
}

// Helper function to get department type info
export function getDepartmentTypeInfo(name: string): (typeof departmentTypes)[0] {
	const lowerName = name.toLowerCase();
	return (
		departmentTypes.find(
			(type) => lowerName.includes(type.value) || lowerName.includes(type.label.toLowerCase())
		) || departmentTypes[5]
	); // Default to operations
}

// Helper function to build team hierarchy for visualization
export function buildTeamHierarchy(departments: Department[]): TeamHierarchyNode[] {
	const departmentMap = new Map(departments.map((dept) => [dept.id, dept]));
	const rootNodes: TeamHierarchyNode[] = [];

	const buildNode = (dept: Department): TeamHierarchyNode => {
		const children = departments.filter((d) => d.parentDepartmentId === dept.id).map(buildNode);

		return {
			id: dept.id,
			name: dept.name,
			description: dept.description ?? undefined,
			departmentHead: (dept.departmentHead as unknown as User) ?? undefined,
			employeeCount: dept.employees?.totalCount || 0,
			activeEmployeeCount: dept.activeEmployees?.totalCount || 0,
			children,
			level: 0 // Will be set when building hierarchy
		};
	};

	// Find root departments (no parent)
	const rootDepartments = departments.filter((dept) => !dept.parentDepartmentId);

	rootDepartments.forEach((dept) => {
		rootNodes.push(buildNode(dept));
	});

	// Set levels for hierarchy visualization
	const setLevels = (nodes: TeamHierarchyNode[], level: number = 0) => {
		nodes.forEach((node) => {
			node.level = level;
			setLevels(node.children, level + 1);
		});
	};

	setLevels(rootNodes);

	return rootNodes;
}

// Helper function to flatten hierarchy for search/filter
export function flattenTeamHierarchy(hierarchy: TeamHierarchyNode[]): TeamHierarchyNode[] {
	const flattened: TeamHierarchyNode[] = [];

	const traverse = (nodes: TeamHierarchyNode[]) => {
		nodes.forEach((node) => {
			flattened.push(node);
			traverse(node.children);
		});
	};

	traverse(hierarchy);
	return flattened;
}

// Helper function to calculate team statistics
export function calculateTeamStats(departments: Department[]) {
	const totalTeams = departments.length;
	const totalEmployees = departments.reduce(
		(sum, dept) => sum + (dept.employees?.totalCount || 0),
		0
	);
	const activeEmployees = departments.reduce(
		(sum, dept) => sum + (dept.activeEmployees?.totalCount || 0),
		0
	);
	const teamsWithHeads = departments.filter((dept) => dept.departmentHead).length;
	const averageTeamSize = totalTeams > 0 ? Math.round(totalEmployees / totalTeams) : 0;

	const sizeDistribution = teamSizeCategories.map((category) => ({
		...category,
		count: departments.filter((dept) => {
			const count = dept.employees?.totalCount || 0;
			return count >= category.min && count <= category.max;
		}).length
	}));

	return {
		totalTeams,
		totalEmployees,
		activeEmployees,
		teamsWithHeads,
		averageTeamSize,
		sizeDistribution,
		utilizationRate: totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0
	};
}

// TypeScript interfaces for helper functions
export interface TeamHierarchyNode {
	id: string;
	name: string;
	description?: string;
	departmentHead?: User;
	employeeCount: number;
	activeEmployeeCount: number;
	children: TeamHierarchyNode[];
	level: number;
}

export interface TeamStats {
	totalTeams: number;
	totalEmployees: number;
	activeEmployees: number;
	teamsWithHeads: number;
	averageTeamSize: number;
	sizeDistribution: Array<{
		value: string;
		label: string;
		min: number;
		max: number;
		color: string;
		count: number;
	}>;
	utilizationRate: number;
}

// Helper function to build search filter object safely
export function buildDepartmentFilter({
	searchTerm,
	parentDepartmentId,
	departmentHeadId,
	hasEmployees
}: {
	searchTerm?: string;
	parentDepartmentId?: string;
	departmentHeadId?: string;
	hasEmployees?: boolean;
}): DepartmentFilter {
	const filter: DepartmentFilter = {};

	if (searchTerm) {
		filter.name = { includesInsensitive: searchTerm };
	}

	if (parentDepartmentId) {
		filter.parentDepartmentId = { equalTo: parentDepartmentId };
	}

	if (departmentHeadId) {
		filter.departmentHeadId = { equalTo: departmentHeadId };
	}

	return filter;
}

/**
 * T031: Standardized Team Management Operations with Error Handling
 */
import type { DataRequest, UserCredentials } from '$lib/models/data-request';

export class TeamManagementOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async getTeamOverview(params: {
		departmentId?: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetTeamOverview',
			variables: { departmentId: params.departmentId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_TEAM_DETAILS, { id: params.departmentId })
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load team overview. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No team overview data returned. Please try again.'
				});
			}

			return result.data;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load team overview. Please try again.'
			});
		}
	}
}

export function createTeamManagementOperations(client: Client): TeamManagementOperations {
	return new TeamManagementOperations(client);
}
