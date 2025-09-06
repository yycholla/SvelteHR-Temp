// Modernized to use Svelte 5 runes instead of Svelte 4 writable stores

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
		filtered = filtered.filter(emp => 
			emp.first_name.toLowerCase().includes(search) ||
			emp.last_name.toLowerCase().includes(search) ||
			emp.email.toLowerCase().includes(search)
		);
	}
	
	if (employeeState.filters.department) {
		filtered = filtered.filter(emp => emp.department === employeeState.filters.department);
	}
	
	if (employeeState.filters.status) {
		filtered = filtered.filter(emp => emp.status === employeeState.filters.status);
	}
	
	return filtered;
});

export const activeEmployees = $derived(
	employeeState.employees.filter(emp => emp.status === 'active')
);

export const hasEmployees = $derived(employeeState.employees.length > 0);

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
		const index = employeeState.employees.findIndex(e => e.id === employee.id);
		if (index !== -1) {
			employeeState.employees[index] = employee;
		}
		
		// Update selected employee if it matches
		if (employeeState.selectedEmployee?.id === employee.id) {
			employeeState.selectedEmployee = employee;
		}
	},

	removeEmployee(employeeId: string) {
		employeeState.employees = employeeState.employees.filter(e => e.id !== employeeId);
		employeeState.total = employeeState.total - 1;
		
		// Clear selected employee if it was deleted
		if (employeeState.selectedEmployee?.id === employeeId) {
			employeeState.selectedEmployee = null;
		}
	},

	clearEmployees() {
		Object.assign(employeeState, initialState);
	},

	// Utility methods
	getEmployeeById(id: string): Employee | undefined {
		return employeeState.employees.find(e => e.id === id);
	},

	getEmployeesByDepartment(department: string): Employee[] {
		return employeeState.employees.filter(e => e.department === department);
	}
};