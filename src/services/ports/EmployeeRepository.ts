// src/services/ports/EmployeeRepository.ts
import type {
	Employee,
	Result,
	DomainError,
	EmployeeListFilters,
	EmployeeListResult
} from '$domain';

/**
 * Employee statistics aggregated from the repository
 */
export interface EmployeeStatistics {
	total: number;
	active: number;
	inactive: number;
	byDepartment?: Array<{
		departmentId: string | null;
		departmentName: string | null;
		count: number;
	}>;
}

export interface EmployeeRepository {
	findById(id: string): Promise<Employee | null>;
	findByEmail(email: string): Promise<Employee | null>;
	findAll(filters?: EmployeeListFilters): Promise<EmployeeListResult>;
	save(employee: Employee): Promise<Employee>;
	update(id: string, employee: Employee): Promise<Employee>;
	delete(id: string): Promise<void>;
	exists(id: string): Promise<boolean>;
	getStatistics(): Promise<EmployeeStatistics>;
}
