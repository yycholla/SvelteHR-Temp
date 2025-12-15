import type { Department, User } from '$lib/types/index';
import type { DepartmentFilter, TeamHierarchyNode } from './types';

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
		const children = departments
			.filter((d) => d.parentDepartmentId === dept.id) // Corrected from parentDepartmentId
			.map(buildNode);

		return {
			id: dept.id,
			name: dept.name,
			description: dept.description ?? undefined,
			departmentHead: (dept.manager as unknown as User) ?? undefined, // Using manager instead of departmentHead
			employeeCount: dept.employeeCount || 0,
			activeEmployeeCount: 0, // Placeholder
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
	const totalEmployees = departments.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0);
	const activeEmployees = 0; // Placeholder
	const teamsWithHeads = departments.filter((dept) => dept.manager).length;
	const averageTeamSize = totalTeams > 0 ? Math.round(totalEmployees / totalTeams) : 0;

	const sizeDistribution = teamSizeCategories.map((category) => ({
		...category,
		count: departments.filter((dept) => {
			const count = dept.employeeCount || 0;
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