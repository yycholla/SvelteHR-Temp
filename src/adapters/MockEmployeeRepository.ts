// src/adapters/MockEmployeeRepository.ts
import type { Employee, EmployeeListFilters, EmployeeListResult } from '$domain';
import type { EmployeeRepository } from '$services';

export class MockEmployeeRepository implements EmployeeRepository {
	private employees = new Map<string, Employee>();

	async findById(id: string): Promise<Employee | null> {
		return this.employees.get(id) ?? null;
	}

	async findByEmail(email: string): Promise<Employee | null> {
		for (const employee of this.employees.values()) {
			if (employee.email.value === email) {
				return employee;
			}
		}
		return null;
	}

	async findAll(filters?: EmployeeListFilters): Promise<EmployeeListResult> {
		let results = Array.from(this.employees.values());

		// Apply filters
		if (filters?.departmentId) {
			results = results.filter((emp) => emp.departmentId === filters.departmentId);
		}

		if (filters?.isActive !== undefined) {
			results = results.filter((emp) => emp.isActive === filters.isActive);
		}

		if (filters?.searchTerm) {
			const term = filters.searchTerm.toLowerCase();
			results = results.filter(
				(emp) =>
					emp.fullName.toLowerCase().includes(term) || emp.email.value.toLowerCase().includes(term)
			);
		}

		// Get total before pagination
		const total = results.length;

		// Apply sorting
		const sortBy = filters?.sortBy || 'name';
		const sortOrder = filters?.sortOrder || 'asc';

		results.sort((a, b) => {
			let compareValue = 0;

			switch (sortBy) {
				case 'name':
					compareValue = a.fullName.localeCompare(b.fullName);
					break;
				case 'email':
					compareValue = a.email.value.localeCompare(b.email.value);
					break;
				case 'hireDate':
					compareValue = a.hireDate.value.getTime() - b.hireDate.value.getTime();
					break;
				case 'jobTitle': {
					// Handle null values - nulls always appear last regardless of sort order
					if (a.jobTitle === null && b.jobTitle === null) {
						compareValue = 0;
					} else if (a.jobTitle === null) {
						compareValue = 1; // a (null) always comes after b
					} else if (b.jobTitle === null) {
						compareValue = -1; // b (null) always comes after a
					} else {
						// Only apply sortOrder to non-null comparisons
						compareValue = a.jobTitle.localeCompare(b.jobTitle);
						compareValue = sortOrder === 'asc' ? compareValue : -compareValue;
					}
					// Don't apply sortOrder to null comparisons - they're always last
					return compareValue;
				}
			}

			return sortOrder === 'asc' ? compareValue : -compareValue;
		});

		// Apply pagination
		const offset = filters?.offset ?? 0;
		const limit = filters?.limit ?? total;
		const paginatedResults = results.slice(offset, offset + limit);

		return {
			employees: paginatedResults,
			total,
			limit,
			offset
		};
	}

	async save(employee: Employee): Promise<Employee> {
		this.employees.set(employee.id, employee);
		return employee;
	}

	async update(id: string, employee: Employee): Promise<Employee> {
		// Validate employee exists
		if (!this.employees.has(id)) {
			throw new Error(`Employee with ID ${id} not found`);
		}

		// Validate ID consistency
		if (id !== employee.id) {
			throw new Error(`ID mismatch: expected ${id}, got ${employee.id}`);
		}

		this.employees.set(id, employee);
		return employee;
	}

	async delete(id: string): Promise<void> {
		this.employees.delete(id);
	}

	async exists(id: string): Promise<boolean> {
		return this.employees.has(id);
	}

	// Test helpers
	clear(): void {
		this.employees.clear();
	}

	count(): number {
		return this.employees.size;
	}
}
