import { writable, derived } from 'svelte/store';

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

// Traditional Svelte store
const employeeState = writable<EmployeeState>(initialState);

// Derived stores for computed properties
export const employees = derived(employeeState, $state => $state.employees);
export const selectedEmployee = derived(employeeState, $state => $state.selectedEmployee);
export const filters = derived(employeeState, $state => $state.filters);
export const isLoading = derived(employeeState, $state => $state.loading);
export const total = derived(employeeState, $state => $state.total);

// Computed derived values
export const filteredEmployees = derived(employeeState, $state => {
	let filtered = $state.employees;
	
	if ($state.filters.search) {
		const search = $state.filters.search.toLowerCase();
		filtered = filtered.filter(emp => 
			emp.first_name.toLowerCase().includes(search) ||
			emp.last_name.toLowerCase().includes(search) ||
			emp.email.toLowerCase().includes(search)
		);
	}
	
	if ($state.filters.department) {
		filtered = filtered.filter(emp => emp.department === $state.filters.department);
	}
	
	if ($state.filters.status) {
		filtered = filtered.filter(emp => emp.status === $state.filters.status);
	}
	
	return filtered;
});

export const activeEmployees = derived(employeeState, $state =>
	$state.employees.filter(emp => emp.status === 'active')
);

export const hasEmployees = derived(employeeState, $state => $state.employees.length > 0);

// Store actions
export const employeeActions = {
	setEmployees(employees: Employee[], total: number) {
		employeeState.update(state => ({
			...state,
			employees,
			total,
			loading: false
		}));
	},

	setSelectedEmployee(employee: Employee | null) {
		employeeState.update(state => ({
			...state,
			selectedEmployee: employee
		}));
	},

	updateFilters(newFilters: Partial<EmployeeFilters>) {
		employeeState.update(state => ({
			...state,
			filters: { ...state.filters, ...newFilters }
		}));
	},

	setLoading(loading: boolean) {
		employeeState.update(state => ({
			...state,
			loading
		}));
	},

	addEmployee(employee: Employee) {
		employeeState.update(state => ({
			...state,
			employees: [...state.employees, employee],
			total: state.total + 1
		}));
	},

	updateEmployee(employee: Employee) {
		employeeState.update(state => {
			const index = state.employees.findIndex(e => e.id === employee.id);
			const updatedEmployees = [...state.employees];
			if (index !== -1) {
				updatedEmployees[index] = employee;
			}
			
			return {
				...state,
				employees: updatedEmployees,
				selectedEmployee: state.selectedEmployee?.id === employee.id ? employee : state.selectedEmployee
			};
		});
	},

	removeEmployee(employeeId: string) {
		employeeState.update(state => ({
			...state,
			employees: state.employees.filter(e => e.id !== employeeId),
			total: state.total - 1,
			selectedEmployee: state.selectedEmployee?.id === employeeId ? null : state.selectedEmployee
		}));
	},

	clearEmployees() {
		employeeState.set(initialState);
	}
};

// Combined employee store for backwards compatibility
export const employeeStore = {
	// Store subscription
	subscribe: employeeState.subscribe,
	
	// Actions
	...employeeActions
};