import { writable, derived } from 'svelte/store';
import { useApi, usePaginatedApi, useMutation } from './useApi';
import { EmployeeService, DepartmentService, RoleService } from '$lib/api/services';
import type { Employee, EmployeeFilter, CreateEmployeeInput, UpdateEmployeeInput } from '$lib/schemas/employee';

/**
 * Employee management hooks
 */

// Employee list hook with filtering and pagination
export function useEmployees(initialFilter?: EmployeeFilter) {
	const {
		data,
		loading,
		error,
		pagination,
		loadPage,
		nextPage,
		previousPage,
		refresh
	} = usePaginatedApi<any>('/employees', {
		pageSize: 20,
		transform: (response) => response // EmployeeService handles transformation
	});

	// Current filter state
	const filter = writable<EmployeeFilter>(initialFilter || {});
	
	// Load employees with current filter
	async function loadEmployees(pageNumber = 1) {
		let currentFilter: EmployeeFilter;
		filter.subscribe(f => currentFilter = f)();
		return loadPage(pageNumber, currentFilter!);
	}

	// Update filter and reload
	async function updateFilter(newFilter: Partial<EmployeeFilter>) {
		filter.update(f => ({ ...f, ...newFilter }));
		return loadEmployees(1);
	}

	// Search employees
	async function searchEmployees(searchTerm: string) {
		return updateFilter({ search: searchTerm });
	}

	// Filter by department
	async function filterByDepartment(departmentId: string | undefined) {
		return updateFilter({ departmentId });
	}

	// Filter by status
	async function filterByStatus(status: string | undefined) {
		return updateFilter({ status: status as any });
	}

	// Sort employees
	async function sortEmployees(sortBy: string, order: 'ASC' | 'DESC' = 'ASC') {
		return updateFilter({ sort: sortBy as any, order });
	}

	// Initialize
	if (initialFilter) {
		loadEmployees();
	}

	return {
		employees: data,
		loading,
		error,
		pagination,
		filter,
		loadEmployees,
		updateFilter,
		searchEmployees,
		filterByDepartment,
		filterByStatus,
		sortEmployees,
		nextPage,
		previousPage,
		refresh
	};
}

// Single employee hook
export function useEmployee(employeeId?: string) {
	const employee = useApi<Employee>(
		employeeId ? `/employees/${employeeId}` : '',
		{
			immediate: !!employeeId
		}
	);

	async function loadEmployee(id: string) {
		return employee.fetch({ id });
	}

	return {
		...employee,
		loadEmployee
	};
}

// Employee creation hook
export function useCreateEmployee() {
	const createMutation = useMutation<CreateEmployeeInput, Employee>('/employees', 'POST', {
		onSuccess: (employee) => {
			console.log('Employee created successfully:', employee.firstName, employee.lastName);
		},
		onError: (error) => {
			console.error('Failed to create employee:', error);
		}
	});

	return {
		...createMutation,
		createEmployee: createMutation.mutate
	};
}

// Employee update hook
export function useUpdateEmployee() {
	const updateMutation = useMutation<UpdateEmployeeInput, Employee>('/employees/{id}', 'PUT', {
		onSuccess: (employee) => {
			console.log('Employee updated successfully:', employee.firstName, employee.lastName);
		},
		onError: (error) => {
			console.error('Failed to update employee:', error);
		}
	});

	async function updateEmployee(id: string, data: UpdateEmployeeInput) {
		return updateMutation.mutate(data, { id });
	}

	return {
		...updateMutation,
		updateEmployee
	};
}

// Employee deletion hook
export function useDeleteEmployee() {
	const deleteMutation = useMutation<string, void>('/employees/{id}', 'DELETE', {
		onSuccess: () => {
			console.log('Employee deleted successfully');
		},
		onError: (error) => {
			console.error('Failed to delete employee:', error);
		}
	});

	async function deleteEmployee(id: string) {
		return deleteMutation.mutate(id, { id });
	}

	return {
		...deleteMutation,
		deleteEmployee
	};
}

// Departments hook (for employee forms)
export function useDepartments() {
	const departments = useApi<any[]>('/departments', {
		transform: (response) => response || []
	});

	return {
		departments: departments.data,
		loading: departments.loading,
		error: departments.error,
		refresh: departments.refresh
	};
}

// Roles hook (for employee forms)
export function useRoles() {
	const roles = useApi<any[]>('/roles', {
		transform: (response) => response || []
	});

	return {
		roles: roles.data,
		loading: roles.loading,
		error: roles.error,
		refresh: roles.refresh
	};
}

// Managers hook (for employee forms)
export function useManagers() {
	const managers = useApi<Employee[]>('/employees', {
		transform: (response) => (response?.employees || []).filter((emp: Employee) => emp.isManager),
		cacheDuration: 10 * 60 * 1000 // Cache for 10 minutes
	});

	return {
		managers: managers.data,
		loading: managers.loading,
		error: managers.error,
		refresh: managers.refresh
	};
}

// Employee statistics hook
export function useEmployeeStats() {
	const employees = useEmployees();

	const stats = derived(
		[employees.employees, employees.loading],
		([$employees, $loading]) => {
			if ($loading || !$employees?.employees) {
				return {
					total: 0,
					active: 0,
					onboarding: 0,
					byDepartment: {},
					byRole: {},
					managers: 0
				};
			}

			const employeeList = $employees.employees;
			return {
				total: employeeList.length,
				active: employeeList.filter(e => e.status === 'Active').length,
				onboarding: employeeList.filter(e => e.status === 'Onboarding').length,
				managers: employeeList.filter(e => e.isManager).length,
				byDepartment: employeeList.reduce((acc, emp) => {
					const dept = emp.department?.name || 'Unassigned';
					acc[dept] = (acc[dept] || 0) + 1;
					return acc;
				}, {} as Record<string, number>),
				byRole: employeeList.reduce((acc, emp) => {
					const role = emp.role?.name || 'Unknown';
					acc[role] = (acc[role] || 0) + 1;
					return acc;
				}, {} as Record<string, number>)
			};
		}
	);

	return {
		stats,
		loading: employees.loading,
		error: employees.error
	};
}

// Employee validation hook
export function useEmployeeValidation() {
	async function validateUsername(username: string, excludeId?: string): Promise<boolean> {
		try {
			const employees = await EmployeeService.list({ search: username });
			const existing = employees.employees.find(e => 
				e.username === username && e.id !== excludeId
			);
			return !existing;
		} catch {
			return true; // Assume valid if validation fails
		}
	}

	async function validateEmail(email: string, excludeId?: string): Promise<boolean> {
		try {
			const employees = await EmployeeService.list({ search: email });
			const existing = employees.employees.find(e => 
				e.email === email && e.id !== excludeId
			);
			return !existing;
		} catch {
			return true; // Assume valid if validation fails
		}
	}

	return {
		validateUsername,
		validateEmail
	};
}