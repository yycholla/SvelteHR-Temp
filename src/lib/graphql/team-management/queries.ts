import { gql } from '@urql/svelte';

/**
 * GraphQL Queries for Team Management
 *
 * Updated for Rust backend (async-graphql) schema
 * Removed PostGraphile patterns (DepartmentsOrderBy, DepartmentFilter, Relay connections)
 */

/**
 * Query: Get all teams/departments with pagination
 * Backend: Uses departments from Rust GraphQL schema
 */
export const GET_ALL_TEAMS = gql`
	query GetAllTeams($limit: Int = 50, $offset: Int = 0) {
		departments(limit: $limit, offset: $offset) {
			items {
				id
				name
				description
				parentDepartmentId
				createdAt
				updatedAt
			}
		}
	}
`;

/**
 * Query: Get single team/department by ID with detailed information
 * Backend: Uses department from Rust GraphQL schema
 */
export const GET_TEAM_DETAILS = gql`
	query GetTeamDetails($id: UUID!) {
		department(id: $id) {
			id
			name
			description
			parentDepartmentId
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get all departments for hierarchy building
 * Backend: Uses departments from Rust GraphQL schema
 * Note: Hierarchy is built client-side
 */
export const GET_TEAM_HIERARCHY = gql`
	query GetTeamHierarchy($limit: Int = 200, $offset: Int = 0) {
		departments(limit: $limit, offset: $offset) {
			items {
				id
				name
				description
				parentDepartmentId
				createdAt
				updatedAt
			}
		}
	}
`;

/**
 * Query: Search teams (using same departments query)
 * Backend: Uses departments from Rust GraphQL schema
 * Note: Filtering done client-side
 */
export const SEARCH_TEAMS = gql`
	query SearchTeams($limit: Int = 50, $offset: Int = 0) {
		departments(limit: $limit, offset: $offset) {
			items {
				id
				name
				description
				parentDepartmentId
				createdAt
				updatedAt
			}
		}
	}
`;

/**
 * Query: Get all users for team management
 * Backend: Uses users from Rust GraphQL schema
 * Note: Used to get employee counts and details for departments
 */
export const GET_TEAM_USERS = gql`
	query GetTeamUsers($limit: Int = 1000, $offset: Int = 0) {
		users(limit: $limit, offset: $offset) {
			id
			displayName
			email
			jobTitle
			departmentId
			managerId
			isActive
			hireDate
			createdAt
		}
	}
`;

// =============================================================================
// CLIENT-SIDE HELPER FUNCTIONS & TYPES
// =============================================================================

/**
 * Department/Team interface
 */
export interface Department {
	id: string;
	name: string;
	description: string | null;
	parentDepartmentId: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * User interface for team management
 */
export interface TeamUser {
	id: string;
	displayName: string;
	email: string;
	jobTitle: string | null;
	departmentId: string | null;
	managerId: string | null;
	isActive: boolean;
	hireDate: string | null;
	createdAt: string;
}

/**
 * Department with statistics
 */
export interface DepartmentWithStats extends Department {
	employeeCount: number;
	activeEmployeeCount: number;
	subDepartmentCount: number;
	departmentHead: TeamUser | null;
	employees: TeamUser[];
	subDepartments: Department[];
}

/**
 * Build department hierarchy (client-side)
 */
export function buildDepartmentHierarchy(
	departments: Department[],
	rootId: string | null = null
): Department[] {
	return departments.filter((dept) => dept.parentDepartmentId === rootId);
}

/**
 * Get all sub-departments for a department (client-side)
 */
export function getSubDepartments(departments: Department[], parentId: string): Department[] {
	return departments.filter((dept) => dept.parentDepartmentId === parentId);
}

/**
 * Get department employees (client-side)
 */
export function getDepartmentEmployees(users: TeamUser[], departmentId: string): TeamUser[] {
	return users.filter((user) => user.departmentId === departmentId);
}

/**
 * Get active employees for department (client-side)
 */
export function getActiveDepartmentEmployees(users: TeamUser[], departmentId: string): TeamUser[] {
	return users.filter((user) => user.departmentId === departmentId && user.isActive);
}

/**
 * Find department head (client-side)
 * Assumes department head is the user with no manager in the department
 */
export function findDepartmentHead(users: TeamUser[], departmentId: string): TeamUser | null {
	const deptUsers = getDepartmentEmployees(users, departmentId);
	// Find user with no manager or manager not in same department
	const head = deptUsers.find(
		(user) => !user.managerId || !deptUsers.some((u) => u.id === user.managerId)
	);
	return head || null;
}

/**
 * Calculate department statistics (client-side)
 */
export function calculateDepartmentStats(
	department: Department,
	allDepartments: Department[],
	users: TeamUser[]
): DepartmentWithStats {
	const employees = getDepartmentEmployees(users, department.id);
	const activeEmployees = getActiveDepartmentEmployees(users, department.id);
	const subDepartments = getSubDepartments(allDepartments, department.id);
	const departmentHead = findDepartmentHead(users, department.id);

	return {
		...department,
		employeeCount: employees.length,
		activeEmployeeCount: activeEmployees.length,
		subDepartmentCount: subDepartments.length,
		departmentHead,
		employees,
		subDepartments
	};
}

/**
 * Search departments by name (client-side)
 */
export function searchDepartmentsByName(departments: Department[], query: string): Department[] {
	const lowerQuery = query.toLowerCase();
	return departments.filter((dept) => dept.name.toLowerCase().includes(lowerQuery));
}

/**
 * Filter departments by parent (client-side)
 */
export function filterDepartmentsByParent(
	departments: Department[],
	parentId: string | null
): Department[] {
	return departments.filter((dept) => dept.parentDepartmentId === parentId);
}

/**
 * Get department path (breadcrumb) (client-side)
 */
export function getDepartmentPath(departments: Department[], departmentId: string): Department[] {
	const path: Department[] = [];
	let currentId: string | null = departmentId;

	while (currentId) {
		const dept = departments.find((d) => d.id === currentId);
		if (!dept) break;
		path.unshift(dept);
		currentId = dept.parentDepartmentId;
	}

	return path;
}

/**
 * Sort departments by name (client-side)
 */
export function sortDepartmentsByName(departments: Department[]): Department[] {
	return [...departments].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sort departments by employee count (client-side)
 */
export function sortDepartmentsByEmployeeCount(
	departmentsWithStats: DepartmentWithStats[]
): DepartmentWithStats[] {
	return [...departmentsWithStats].sort((a, b) => b.employeeCount - a.employeeCount);
}

/**
 * Get department depth in hierarchy (client-side)
 */
export function getDepartmentDepth(departments: Department[], departmentId: string): number {
	const path = getDepartmentPath(departments, departmentId);
	return path.length - 1; // 0-based depth
}

/**
 * Check if department is leaf (has no sub-departments) (client-side)
 */
export function isLeafDepartment(departments: Department[], departmentId: string): boolean {
	return !departments.some((dept) => dept.parentDepartmentId === departmentId);
}

/**
 * Get all descendant departments (client-side, recursive)
 */
export function getAllDescendantDepartments(
	departments: Department[],
	parentId: string
): Department[] {
	const descendants: Department[] = [];
	const directChildren = getSubDepartments(departments, parentId);

	directChildren.forEach((child) => {
		descendants.push(child);
		descendants.push(...getAllDescendantDepartments(departments, child.id));
	});

	return descendants;
}

/**
 * Calculate total employees including sub-departments (client-side)
 */
export function getTotalEmployeesRecursive(
	departments: Department[],
	users: TeamUser[],
	departmentId: string
): number {
	const directEmployees = getDepartmentEmployees(users, departmentId).length;
	const descendants = getAllDescendantDepartments(departments, departmentId);
	const descendantEmployees = descendants.reduce(
		(count, dept) => count + getDepartmentEmployees(users, dept.id).length,
		0
	);

	return directEmployees + descendantEmployees;
}
