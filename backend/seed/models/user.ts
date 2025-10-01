import {
	generateEmail,
	generatePhoneNumber,
	generateAddress,
	getRandomElement,
	getWeightedRandom,
	FIRST_NAMES,
	LAST_NAMES,
	USER_ROLE_DISTRIBUTION
} from '../config';

export interface SeedUser {
	id?: number;
	email: string;
	firstName: string;
	lastName: string;
	role: 'Admin' | 'HR Manager' | 'Manager' | 'Employee';
	departmentId: number;
	isActive: boolean;
	hireDate: Date;
	phoneNumber?: string;
	address: {
		street: string;
		city: string;
		state: string;
		zip: string;
		country: string;
	};
	createdAt: Date;
	updatedAt: Date;
}

export class SeedUserModel {
	/**
	 * Generate a realistic user with proper relationships
	 */
	static generate(departmentId: number, forceRole?: string): SeedUser {
		const firstName = getRandomElement(FIRST_NAMES);
		const lastName = getRandomElement(LAST_NAMES);
		const email = generateEmail(firstName, lastName);
		const role = forceRole || getWeightedRandom(USER_ROLE_DISTRIBUTION);

		// Generate hire date between 6 months and 5 years ago
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
		const fiveYearsAgo = new Date();
		fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

		const hireDate = new Date(
			fiveYearsAgo.getTime() +
			Math.random() * (sixMonthsAgo.getTime() - fiveYearsAgo.getTime())
		);

		const now = new Date();

		return {
			email,
			firstName,
			lastName,
			role: role as 'Admin' | 'HR Manager' | 'Manager' | 'Employee',
			departmentId,
			isActive: Math.random() > 0.05, // 95% active
			hireDate,
			phoneNumber: Math.random() > 0.3 ? generatePhoneNumber() : undefined,
			address: generateAddress(),
			createdAt: hireDate,
			updatedAt: now
		};
	}

	/**
	 * Generate multiple users with role distribution
	 */
	static generateMultiple(
		count: number,
		departmentIds: number[]
	): SeedUser[] {
		const users: SeedUser[] = [];

		// Calculate role counts based on distribution
		const adminCount = Math.max(1, Math.floor(count * USER_ROLE_DISTRIBUTION.Admin));
		const hrCount = Math.max(1, Math.floor(count * USER_ROLE_DISTRIBUTION['HR Manager']));
		const managerCount = Math.max(1, Math.floor(count * USER_ROLE_DISTRIBUTION.Manager));
		const employeeCount = count - adminCount - hrCount - managerCount;

		// Generate admins
		for (let i = 0; i < adminCount; i++) {
			const departmentId = getRandomElement(departmentIds);
			users.push(SeedUserModel.generate(departmentId, 'Admin'));
		}

		// Generate HR managers
		for (let i = 0; i < hrCount; i++) {
			const departmentId = getRandomElement(departmentIds);
			users.push(SeedUserModel.generate(departmentId, 'HR Manager'));
		}

		// Generate managers
		for (let i = 0; i < managerCount; i++) {
			const departmentId = getRandomElement(departmentIds);
			users.push(SeedUserModel.generate(departmentId, 'Manager'));
		}

		// Generate employees
		for (let i = 0; i < employeeCount; i++) {
			const departmentId = getRandomElement(departmentIds);
			users.push(SeedUserModel.generate(departmentId, 'Employee'));
		}

		return users;
	}

	/**
	 * Convert to GraphQL mutation input
	 */
	static toGraphQLInput(user: SeedUser): object {
		return {
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			departmentId: user.departmentId,
			isActive: user.isActive,
			hireDate: user.hireDate.toISOString().split('T')[0],
			phoneNumber: user.phoneNumber,
			address: JSON.stringify(user.address)
		};
	}

	/**
	 * Validate user data
	 */
	static validate(user: SeedUser): string[] {
		const errors: string[] = [];

		if (!user.email || !user.email.includes('@')) {
			errors.push('Invalid email address');
		}

		if (!user.firstName || user.firstName.length < 2) {
			errors.push('First name must be at least 2 characters');
		}

		if (!user.lastName || user.lastName.length < 2) {
			errors.push('Last name must be at least 2 characters');
		}

		if (!['Admin', 'HR Manager', 'Manager', 'Employee'].includes(user.role)) {
			errors.push('Invalid role');
		}

		if (!user.departmentId || user.departmentId < 1) {
			errors.push('Invalid department ID');
		}

		if (!user.hireDate || user.hireDate > new Date()) {
			errors.push('Hire date cannot be in the future');
		}

		return errors;
	}

	/**
	 * Generate admin user for system
	 */
	static generateAdmin(): SeedUser {
		return {
			email: 'admin@company.com',
			firstName: 'System',
			lastName: 'Administrator',
			role: 'Admin',
			departmentId: 1, // Executive department
			isActive: true,
			hireDate: new Date('2020-01-01'),
			phoneNumber: '(555) 000-0001',
			address: {
				street: '123 Corporate Blvd',
				city: 'Business City',
				state: 'CA',
				zip: '90210',
				country: 'USA'
			},
			createdAt: new Date('2020-01-01'),
			updatedAt: new Date()
		};
	}

	/**
	 * Generate test users for development
	 */
	static generateTestUsers(): SeedUser[] {
		return [
			SeedUserModel.generateAdmin(),
			{
				email: 'hr@company.com',
				firstName: 'Jane',
				lastName: 'HR Manager',
				role: 'HR Manager',
				departmentId: 7, // HR department
				isActive: true,
				hireDate: new Date('2021-03-15'),
				phoneNumber: '(555) 000-0002',
				address: {
					street: '456 People St',
					city: 'HR Town',
					state: 'NY',
					zip: '10001',
					country: 'USA'
				},
				createdAt: new Date('2021-03-15'),
				updatedAt: new Date()
			},
			{
				email: 'manager@company.com',
				firstName: 'Bob',
				lastName: 'Team Lead',
				role: 'Manager',
				departmentId: 2, // Engineering department
				isActive: true,
				hireDate: new Date('2022-01-10'),
				phoneNumber: '(555) 000-0003',
				address: {
					street: '789 Tech Ave',
					city: 'Dev City',
					state: 'WA',
					zip: '98101',
					country: 'USA'
				},
				createdAt: new Date('2022-01-10'),
				updatedAt: new Date()
			}
		];
	}
}