// src/services/ports/EmployeeRepository.ts
import type {
	Employee,
	Result,
	DomainError,
	EmployeeListFilters,
	EmployeeListResult
} from '$domain';

/**
 * @deprecated Use EmployeeListFilters instead
 */
export interface EmployeeFilters {
	departmentId?: string;
	isActive?: boolean;
	searchTerm?: string;
}

export interface EmployeeRepository {
	findById(id: string): Promise<Employee | null>;
	findByEmail(email: string): Promise<Employee | null>;
	findAll(filters?: EmployeeListFilters): Promise<EmployeeListResult>;
	save(employee: Employee): Promise<Employee>;
	update(id: string, employee: Employee): Promise<Employee>;
	delete(id: string): Promise<void>;
	exists(id: string): Promise<boolean>;
}
