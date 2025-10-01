import {
	getRandomElement,
	getRandomInt,
	DEPARTMENT_NAMES
} from '../config';

export interface SeedDepartment {
	id?: number;
	name: string;
	code: string;
	parentDepartmentId?: number;
	managerId?: number;
	budget?: number;
	headcount: number;
	location: string;
	isActive: boolean;
	createdAt: Date;
}

export class SeedDepartmentModel {
	/**
	 * Generate a realistic department
	 */
	static generate(
		name?: string,
		parentId?: number
	): SeedDepartment {
		const departmentName = name || getRandomElement(DEPARTMENT_NAMES);
		const code = SeedDepartmentModel.generateDepartmentCode(departmentName);

		// Generate budget between $500K and $5M for departments
		const budget = parentId
			? getRandomInt(100000, 1000000) // Sub-departments have smaller budgets
			: getRandomInt(500000, 5000000); // Main departments have larger budgets

		// Estimate headcount based on department type
		const headcount = SeedDepartmentModel.estimateHeadcount(departmentName, !!parentId);

		const locations = [
			'San Francisco, CA',
			'New York, NY',
			'Austin, TX',
			'Seattle, WA',
			'Boston, MA',
			'Chicago, IL',
			'Los Angeles, CA',
			'Denver, CO'
		];

		return {
			name: departmentName,
			code,
			parentDepartmentId: parentId,
			budget,
			headcount,
			location: getRandomElement(locations),
			isActive: true,
			createdAt: new Date()
		};
	}

	/**
	 * Generate department code from name
	 */
	static generateDepartmentCode(name: string): string {
		// Generate 3-4 letter code from department name
		const words = name.split(' ');

		if (words.length === 1) {
			// Single word: take first 3-4 characters
			return words[0].substring(0, 4).toUpperCase();
		} else {
			// Multiple words: take first letter of each word
			const acronym = words.map(word => word.charAt(0)).join('');
			return acronym.substring(0, 4).toUpperCase();
		}
	}

	/**
	 * Estimate realistic headcount for department
	 */
	static estimateHeadcount(name: string, isSubDepartment: boolean): number {
		const baseSize = isSubDepartment ? 5 : 15;
		const multiplier = isSubDepartment ? 1.5 : 3;

		// Adjust based on department type
		let sizeFactor = 1;

		if (name.includes('Engineering')) sizeFactor = 2.5;
		else if (name.includes('Sales')) sizeFactor = 2;
		else if (name.includes('Marketing')) sizeFactor = 1.5;
		else if (name.includes('Customer')) sizeFactor = 1.8;
		else if (name.includes('Executive')) sizeFactor = 0.3;
		else if (name.includes('Legal')) sizeFactor = 0.4;
		else if (name.includes('Finance')) sizeFactor = 0.7;

		const estimatedSize = Math.round(baseSize * sizeFactor * multiplier);
		return Math.max(1, estimatedSize);
	}

	/**
	 * Generate hierarchical department structure
	 */
	static generateHierarchy(): SeedDepartment[] {
		const departments: SeedDepartment[] = [];

		// Root company department
		const company = SeedDepartmentModel.generate('Company', undefined);
		company.headcount = 150; // Total company headcount
		company.budget = 25000000; // $25M total budget
		departments.push(company);

		// Main divisions
		const mainDivisions = [
			'Executive',
			'Engineering',
			'Product',
			'Sales',
			'Marketing',
			'Customer Success',
			'Human Resources',
			'Finance',
			'Operations'
		];

		const divisionDepartments: SeedDepartment[] = [];

		mainDivisions.forEach(divisionName => {
			const division = SeedDepartmentModel.generate(divisionName, 1);
			departments.push(division);
			divisionDepartments.push(division);
		});

		// Sub-departments for some divisions
		const subDepartments = [
			{ parent: 'Engineering', subs: ['Frontend', 'Backend', 'DevOps', 'QA'] },
			{ parent: 'Product', subs: ['Product Management', 'Design', 'Research'] },
			{ parent: 'Sales', subs: ['Inside Sales', 'Enterprise Sales', 'Sales Engineering'] },
			{ parent: 'Marketing', subs: ['Digital Marketing', 'Content Marketing', 'Growth'] }
		];

		subDepartments.forEach(({ parent, subs }) => {
			const parentDept = divisionDepartments.find(d => d.name === parent);
			if (parentDept) {
				subs.forEach(subName => {
					const subDept = SeedDepartmentModel.generate(subName, parentDept.id);
					departments.push(subDept);
				});
			}
		});

		return departments;
	}

	/**
	 * Convert to GraphQL mutation input
	 */
	static toGraphQLInput(department: SeedDepartment): object {
		return {
			name: department.name,
			code: department.code,
			parentDepartmentId: department.parentDepartmentId,
			budget: department.budget,
			headcount: department.headcount,
			location: department.location,
			isActive: department.isActive
		};
	}

	/**
	 * Validate department data
	 */
	static validate(department: SeedDepartment): string[] {
		const errors: string[] = [];

		if (!department.name || department.name.length < 2) {
			errors.push('Department name must be at least 2 characters');
		}

		if (!department.code || department.code.length < 2) {
			errors.push('Department code must be at least 2 characters');
		}

		if (department.code && department.code.length > 5) {
			errors.push('Department code must be 5 characters or less');
		}

		if (department.budget && department.budget < 0) {
			errors.push('Budget cannot be negative');
		}

		if (department.headcount < 0) {
			errors.push('Headcount cannot be negative');
		}

		if (department.parentDepartmentId && department.parentDepartmentId < 1) {
			errors.push('Invalid parent department ID');
		}

		return errors;
	}

	/**
	 * Calculate department metrics
	 */
	static calculateMetrics(departments: SeedDepartment[]): {
		totalDepartments: number;
		totalBudget: number;
		totalHeadcount: number;
		avgBudgetPerDept: number;
		avgHeadcountPerDept: number;
	} {
		const totalDepartments = departments.length;
		const totalBudget = departments.reduce((sum, dept) => sum + (dept.budget || 0), 0);
		const totalHeadcount = departments.reduce((sum, dept) => sum + dept.headcount, 0);

		return {
			totalDepartments,
			totalBudget,
			totalHeadcount,
			avgBudgetPerDept: totalDepartments > 0 ? totalBudget / totalDepartments : 0,
			avgHeadcountPerDept: totalDepartments > 0 ? totalHeadcount / totalDepartments : 0
		};
	}

	/**
	 * Find departments by hierarchy level
	 */
	static getByLevel(departments: SeedDepartment[], level: number): SeedDepartment[] {
		if (level === 1) {
			// Root departments (no parent)
			return departments.filter(dept => !dept.parentDepartmentId);
		} else if (level === 2) {
			// First level children
			const rootDepts = SeedDepartmentModel.getByLevel(departments, 1);
			const rootIds = rootDepts.map(dept => dept.id).filter(Boolean);
			return departments.filter(dept => rootIds.includes(dept.parentDepartmentId!));
		} else {
			// Deeper levels
			const parentLevelDepts = SeedDepartmentModel.getByLevel(departments, level - 1);
			const parentIds = parentLevelDepts.map(dept => dept.id).filter(Boolean);
			return departments.filter(dept => parentIds.includes(dept.parentDepartmentId!));
		}
	}
}