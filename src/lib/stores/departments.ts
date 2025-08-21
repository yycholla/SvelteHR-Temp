import { departmentApi } from '$lib/api/departments';
import type {
	Department,
	DepartmentTreeNode,
	CreateDepartmentRequest,
	UpdateDepartmentRequest,
	DepartmentQueryOptions
} from '$lib/types/department';

interface DepartmentState {
	departments: Department[];
	hierarchy: DepartmentTreeNode[];
	currentDepartment: Department | null;
	loading: boolean;
	error: string | null;
}

// Svelte 5 runes-based department store
let departmentState = $state<DepartmentState>({
	departments: [],
	hierarchy: [],
	currentDepartment: null,
	loading: false,
	error: null
});

// Derived computed properties
export const isLoading = $derived(departmentState.loading);
export const departments = $derived(departmentState.departments);
export const hierarchy = $derived(departmentState.hierarchy);
export const currentDepartment = $derived(departmentState.currentDepartment);
export const error = $derived(departmentState.error);

// Computed derived values
export const activeDepartments = $derived(
	departmentState.departments.filter(dept => dept.is_active)
);

export const rootDepartments = $derived(
	departmentState.departments.filter(dept => !dept.parent_id)
);

// Store actions
export const departmentActions = {
	// Load all departments
	async loadDepartments(options?: DepartmentQueryOptions) {
		departmentState.loading = true;
		departmentState.error = null;
		
		try {
			const response = await departmentApi.list(options);
			departmentState.departments = response.departments;
		} catch (err) {
			departmentState.error = err instanceof Error ? err.message : 'Failed to load departments';
		} finally {
			departmentState.loading = false;
		}
	},

	// Load department hierarchy
	async loadHierarchy() {
		departmentState.loading = true;
		departmentState.error = null;
		
		try {
			const response = await departmentApi.getHierarchy();
			departmentState.hierarchy = response.hierarchy;
		} catch (err) {
			departmentState.error = err instanceof Error ? err.message : 'Failed to load department hierarchy';
		} finally {
			departmentState.loading = false;
		}
	},

	// Load a specific department
	async loadDepartment(id: string) {
		departmentState.loading = true;
		departmentState.error = null;
		
		try {
			const department = await departmentApi.getById(id);
			departmentState.currentDepartment = department;
			
			// Update in departments array if it exists
			const index = departmentState.departments.findIndex(d => d.id === id);
			if (index !== -1) {
				departmentState.departments[index] = department;
			}
		} catch (err) {
			departmentState.error = err instanceof Error ? err.message : 'Failed to load department';
		} finally {
			departmentState.loading = false;
		}
	},

	// Create a new department
	async createDepartment(data: CreateDepartmentRequest) {
		departmentState.loading = true;
		departmentState.error = null;
		
		try {
			const newDepartment = await departmentApi.create(data);
			departmentState.departments = [...departmentState.departments, newDepartment];
			return newDepartment;
		} catch (err) {
			departmentState.error = err instanceof Error ? err.message : 'Failed to create department';
			throw err;
		} finally {
			departmentState.loading = false;
		}
	},

	// Update a department
	async updateDepartment(id: string, data: UpdateDepartmentRequest) {
		departmentState.loading = true;
		departmentState.error = null;
		
		try {
			const updatedDepartment = await departmentApi.update(id, data);
			
			// Update in departments array
			const index = departmentState.departments.findIndex(d => d.id === id);
			if (index !== -1) {
				departmentState.departments[index] = updatedDepartment;
			}
			
			// Update current department if it matches
			if (departmentState.currentDepartment?.id === id) {
				departmentState.currentDepartment = updatedDepartment;
			}
			
			return updatedDepartment;
		} catch (err) {
			departmentState.error = err instanceof Error ? err.message : 'Failed to update department';
			throw err;
		} finally {
			departmentState.loading = false;
		}
	},

	// Delete a department
	async deleteDepartment(id: string) {
		departmentState.loading = true;
		departmentState.error = null;
		
		try {
			await departmentApi.delete(id);
			
			// Remove from departments array
			departmentState.departments = departmentState.departments.filter(d => d.id !== id);
			
			// Clear current department if it was deleted
			if (departmentState.currentDepartment?.id === id) {
				departmentState.currentDepartment = null;
			}
		} catch (err) {
			departmentState.error = err instanceof Error ? err.message : 'Failed to delete department';
			throw err;
		} finally {
			departmentState.loading = false;
		}
	},

	// Clear current department
	clearCurrentDepartment() {
		departmentState.currentDepartment = null;
	},

	// Clear error
	clearError() {
		departmentState.error = null;
	},

	// Get department by ID from current state
	getDepartmentById(id: string): Department | undefined {
		return departmentState.departments.find(d => d.id === id);
	},

	// Get children of a department
	getChildren(parentId: string): Department[] {
		return departmentState.departments.filter(d => d.parent_id === parentId);
	},

	// Get department path (breadcrumb)
	getDepartmentPath(id: string): Department[] {
		const path: Department[] = [];
		let current = departmentState.departments.find(d => d.id === id);
		
		while (current) {
			path.unshift(current);
			if (current.parent_id) {
				current = departmentState.departments.find(d => d.id === current?.parent_id);
			} else {
				break;
			}
		}
		
		return path;
	}
};