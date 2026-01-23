import { faker } from '@faker-js/faker';
import { Employee } from '$domain/Employee/Employee';
import type { CreateEmployeeData } from '$domain/Employee/types';

/**
 * Test data factories for creating consistent test objects.
 */

export class EmployeeFactory {
	static create(overrides?: Partial<CreateEmployeeData>): Employee {
		// Generate a valid international phone number
		// Format: +[country code 1-999][10 random digits] = 11-13 total digits
		// Validates against Employee domain regex: /^\+?[1-9]\d{9,14}$/
		const generateValidPhone = (): string => {
			const countryCode = faker.number.int({ min: 1, max: 999 });
			const remaining = faker.string.numeric(10);
			return `+${countryCode}${remaining}`;
		};

		const data: CreateEmployeeData = {
			id: faker.string.uuid(),
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			hireDate: faker.date.past({ years: 5 }),
			departmentId: faker.string.uuid(),
			jobTitle: faker.person.jobTitle(),
			phone: generateValidPhone(),
			...overrides
		};

		const result = Employee.create(data);
		if (result.isError) {
			throw new Error(`Failed to create employee: ${result.error.message}`);
		}

		return result.value;
	}

	static createMany(count: number, overrides?: Partial<CreateEmployeeData>): Employee[] {
		return Array.from({ length: count }, () => this.create(overrides));
	}

	static createInactive(overrides?: Partial<CreateEmployeeData>): Employee {
		const employee = this.create(overrides);
		employee.deactivate();
		return employee;
	}

	static createWithDepartment(
		departmentId: string,
		overrides?: Partial<CreateEmployeeData>
	): Employee {
		return this.create({ ...overrides, departmentId });
	}
}

export class DepartmentFactory {
	static create(overrides?: Partial<Department>): Department {
		return {
			id: faker.string.uuid(),
			name: faker.helpers.arrayElement(['Engineering', 'HR', 'Sales', 'Marketing']),
			...overrides
		};
	}
}

export class RoleFactory {
	static create(overrides?: Partial<Role>): Role {
		return {
			id: faker.string.uuid(),
			name: faker.person.jobTitle(),
			...overrides
		};
	}
}

// Placeholder types (will be replaced with real domain types)
interface Department {
	id: string;
	name: string;
}

interface Role {
	id: string;
	name: string;
}
