// Migrated to Svelte 5 runes for better performance and reactivity

export interface Employee {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	department: string;
	position: string;
	status: 'active' | 'inactive' | 'terminated';
	hire_date: string;
	phone: string;
	manager_id?: string;
	salary?: number;
	created_at: string;
	updated_at: string;
}

export interface EmployeeFilters {
	search: string;
	department: string;
	status: string;
	page: number;
	limit: number;
}

export interface EmployeeState {
	employees: Employee[];
	selectedEmployee: Employee | null;
	filters: EmployeeFilters;
	loading: boolean;
	total: number;
}

const initialState: EmployeeState = {
	employees: [],
	selectedEmployee: null,
	filters: {
		search: '',
		department: '',
		status: '',
		page: 1,
		limit: 10
	},
	loading: false,
	total: 0
};

// Svelte 5 runes-based employee store
let employeeState = $state<EmployeeState>(initialState);

// Derived computed properties
export const employees = $derived(employeeState.employees);
export const selectedEmployee = $derived(employeeState.selectedEmployee);
export const filters = $derived(employeeState.filters);
export const isLoading = $derived(employeeState.loading);
export const total = $derived(employeeState.total);

// Computed derived values
export const filteredEmployees = $derived(() => {
	let filtered = employeeState.employees;

	if (employeeState.filters.search) {
		const search = employeeState.filters.search.toLowerCase();
		filtered = filtered.filter(
			(emp) =>
				emp.first_name.toLowerCase().includes(search) ||
				emp.last_name.toLowerCase().includes(search) ||
				emp.email.toLowerCase().includes(search)
		);
	}

	if (employeeState.filters.department) {
		filtered = filtered.filter((emp) => emp.department === employeeState.filters.department);
	}

	if (employeeState.filters.status) {
		filtered = filtered.filter((emp) => emp.status === employeeState.filters.status);
	}

	return filtered;
});

export const activeEmployees = $derived(
	employeeState.employees.filter((emp) => emp.status === 'active')
);

export const hasEmployees = $derived(employeeState.employees.length > 0);

// Additional computed values for better UX
export const employeeCount = $derived(employeeState.employees.length);
export const activeEmployeeCount = $derived(activeEmployees.length);
export const selectedEmployeeName = $derived(() => {
	const emp = employeeState.selectedEmployee;
	return emp ? `${emp.first_name} ${emp.last_name}` : '';
});

// Pagination derived values
export const currentPage = $derived(employeeState.filters.page);
export const pageSize = $derived(employeeState.filters.limit);
export const totalPages = $derived(Math.ceil(employeeState.total / employeeState.filters.limit));
export const hasNextPage = $derived(employeeState.filters.page < totalPages);
export const hasPrevPage = $derived(employeeState.filters.page > 1);

// Store actions
export const employeeActions = {
	setEmployees(employees: Employee[], total: number) {
		employeeState.employees = employees;
		employeeState.total = total;
		employeeState.loading = false;
	},

	setSelectedEmployee(employee: Employee | null) {
		employeeState.selectedEmployee = employee;
	},

	updateFilters(newFilters: Partial<EmployeeFilters>) {
		employeeState.filters = { ...employeeState.filters, ...newFilters };
	},

	setLoading(loading: boolean) {
		employeeState.loading = loading;
	},

	addEmployee(employee: Employee) {
		employeeState.employees = [...employeeState.employees, employee];
		employeeState.total = employeeState.total + 1;
	},

	updateEmployee(employee: Employee) {
		const index = employeeState.employees.findIndex((e) => e.id === employee.id);
		if (index !== -1) {
			// Create new array with updated employee
			const updatedEmployees = [...employeeState.employees];
			updatedEmployees[index] = employee;
			employeeState.employees = updatedEmployees;

			// Update selected employee if it matches
			if (employeeState.selectedEmployee?.id === employee.id) {
				employeeState.selectedEmployee = employee;
			}
		}
	},

	removeEmployee(employeeId: string) {
		employeeState.employees = employeeState.employees.filter((e) => e.id !== employeeId);
		employeeState.total = employeeState.total - 1;

		// Clear selected employee if it was the one removed
		if (employeeState.selectedEmployee?.id === employeeId) {
			employeeState.selectedEmployee = null;
		}
	},

	clearEmployees() {
		// Reset to initial state
		Object.assign(employeeState, initialState);
	},

	// Additional utility actions for better UX
	selectEmployeeById(employeeId: string) {
		const employee = employeeState.employees.find((e) => e.id === employeeId);
		employeeState.selectedEmployee = employee || null;
	},

	clearSelection() {
		employeeState.selectedEmployee = null;
	},

	clearFilters() {
		employeeState.filters = { ...initialState.filters };
	},

	// Pagination actions
	nextPage() {
		if (hasNextPage) {
			employeeState.filters = { 
				...employeeState.filters, 
				page: employeeState.filters.page + 1 
			};
		}
	},

	prevPage() {
		if (hasPrevPage) {
			employeeState.filters = { 
				...employeeState.filters, 
				page: employeeState.filters.page - 1 
			};
		}
	},

	goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			employeeState.filters = { ...employeeState.filters, page };
		}
	},

	setPageSize(limit: number) {
		employeeState.filters = { ...employeeState.filters, limit, page: 1 };
	},

	// Search action
	setSearch(search: string) {
		employeeState.filters = { ...employeeState.filters, search, page: 1 };
	},

	// Department filter action
	setDepartmentFilter(department: string) {
		employeeState.filters = { ...employeeState.filters, department, page: 1 };
	},

	// Status filter action
	setStatusFilter(status: string) {
		employeeState.filters = { ...employeeState.filters, status, page: 1 };
	},

	// Bulk operations
	bulkUpdateStatus(employeeIds: string[], status: Employee['status']) {
		employeeState.employees = employeeState.employees.map((emp) =>
			employeeIds.includes(emp.id) ? { ...emp, status } : emp
		);
	},

	bulkRemoveEmployees(employeeIds: string[]) {
		employeeState.employees = employeeState.employees.filter(
			(emp) => !employeeIds.includes(emp.id)
		);
		employeeState.total = employeeState.total - employeeIds.length;

		// Clear selection if selected employee was removed
		if (employeeState.selectedEmployee && employeeIds.includes(employeeState.selectedEmployee.id)) {
			employeeState.selectedEmployee = null;
		}
	}
};

// Combined employee store for backwards compatibility and convenience
export const employeeStore = {
	// Provide reactive access to state
	get state() {
		return {
			employees: employees,
			selectedEmployee: selectedEmployee,
			filters: filters,
			loading: isLoading,
			total: total
		};
	},

	// Actions
	...employeeActions
};