import { writable } from 'svelte/store';

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

function createEmployeeStore() {
	const { subscribe, set, update } = writable<{
		employees: Employee[];
		selectedEmployee: Employee | null;
		filters: EmployeeFilters;
		loading: boolean;
		total: number;
	}>({
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
	});

	return {
		subscribe,
		setEmployees: (employees: Employee[], total: number) => {
			update(state => ({ ...state, employees, total, loading: false }));
		},
		setSelectedEmployee: (employee: Employee | null) => {
			update(state => ({ ...state, selectedEmployee: employee }));
		},
		updateFilters: (newFilters: Partial<EmployeeFilters>) => {
			update(state => ({
				...state,
				filters: { ...state.filters, ...newFilters }
			}));
		},
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},
		addEmployee: (employee: Employee) => {
			update(state => ({
				...state,
				employees: [...state.employees, employee],
				total: state.total + 1
			}));
		},
		updateEmployee: (employee: Employee) => {
			update(state => ({
				...state,
				employees: state.employees.map(e => e.id === employee.id ? employee : e),
				selectedEmployee: state.selectedEmployee?.id === employee.id ? employee : state.selectedEmployee
			}));
		},
		removeEmployee: (employeeId: string) => {
			update(state => ({
				...state,
				employees: state.employees.filter(e => e.id !== employeeId),
				total: state.total - 1,
				selectedEmployee: state.selectedEmployee?.id === employeeId ? null : state.selectedEmployee
			}));
		}
	};
}

export const employeeStore = createEmployeeStore();