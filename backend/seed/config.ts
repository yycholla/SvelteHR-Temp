/**
 * Seed Data Configuration
 * Defines parameters for generating test data
 */

export interface EntityCountConfig {
	min: number;
	max: number;
}

export interface SeedConfig {
	users: EntityCountConfig;
	departments: EntityCountConfig;
	leaveRequests: EntityCountConfig;
	performanceReviews: EntityCountConfig;
	goals: EntityCountConfig;
	analytics: EntityCountConfig;
	generateRelationships: boolean;
	preserveExisting: boolean;
	verbose: boolean;
}

/**
 * Default seed configuration
 * Matches requirements: 10-50 records per entity type
 */
export const DEFAULT_SEED_CONFIG: SeedConfig = {
	users: {
		min: 40,
		max: 50
	},
	departments: {
		min: 10,
		max: 15
	},
	leaveRequests: {
		min: 30,
		max: 50
	},
	performanceReviews: {
		min: 30,
		max: 40
	},
	goals: {
		min: 40,
		max: 50
	},
	analytics: {
		min: 50,
		max: 100
	},
	generateRelationships: true,
	preserveExisting: true,
	verbose: true
};

/**
 * User role distribution for seed data
 */
export const USER_ROLE_DISTRIBUTION = {
	Admin: 0.04,        // 2-4% of users
	'HR Manager': 0.09, // 8-10% of users
	Manager: 0.20,      // 20% of users
	Employee: 0.67      // 67-70% of users
};

/**
 * Leave request status distribution
 */
export const LEAVE_STATUS_DISTRIBUTION = {
	approved: 0.40,     // 40% approved
	pending: 0.30,      // 30% pending
	rejected: 0.20,     // 20% rejected
	cancelled: 0.10     // 10% cancelled
};

/**
 * Goal status distribution
 */
export const GOAL_STATUS_DISTRIBUTION = {
	not_started: 0.15,
	in_progress: 0.50,
	completed: 0.30,
	cancelled: 0.05
};

/**
 * Performance rating distribution (bell curve)
 */
export const PERFORMANCE_RATING_DISTRIBUTION = {
	1: 0.05,  // 5% - Needs Improvement
	2: 0.15,  // 15% - Below Expectations
	3: 0.40,  // 40% - Meets Expectations
	4: 0.30,  // 30% - Exceeds Expectations
	5: 0.10   // 10% - Outstanding
};

/**
 * Department names for seed data
 */
export const DEPARTMENT_NAMES = [
	'Executive',
	'Engineering',
	'Product',
	'Sales',
	'Marketing',
	'Customer Success',
	'Human Resources',
	'Finance',
	'Legal',
	'Operations',
	'Research & Development',
	'Quality Assurance',
	'Design',
	'Data Analytics',
	'Security'
];

/**
 * Common first names for seed data
 */
export const FIRST_NAMES = [
	'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer',
	'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara',
	'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah',
	'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
	'Matthew', 'Betty', 'Anthony', 'Dorothy', 'Mark', 'Sandra',
	'Donald', 'Ashley', 'Steven', 'Kimberly', 'Kenneth', 'Emily',
	'Paul', 'Donna', 'Andrew', 'Michelle', 'Joshua', 'Carol',
	'Kevin', 'Amanda', 'Brian', 'Melissa', 'George', 'Deborah',
	'Edward', 'Stephanie', 'Ronald', 'Rebecca'
];

/**
 * Common last names for seed data
 */
export const LAST_NAMES = [
	'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
	'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez',
	'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
	'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
	'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
	'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott',
	'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
	'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
	'Carter', 'Roberts', 'Gomez', 'Phillips'
];

/**
 * Goal categories
 */
export const GOAL_CATEGORIES = [
	'performance',
	'development',
	'project',
	'team'
];

/**
 * Goal priorities
 */
export const GOAL_PRIORITIES = [
	'low',
	'medium',
	'high',
	'critical'
];

/**
 * Leave types
 */
export const LEAVE_TYPES = [
	'vacation',
	'sick',
	'personal',
	'maternity',
	'paternity'
];

/**
 * Get random integer between min and max (inclusive)
 */
export function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random element from array
 */
export function getRandomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get weighted random selection
 */
export function getWeightedRandom<T extends string>(
	distribution: Record<T, number>
): T {
	const random = Math.random();
	let cumulative = 0;

	for (const [key, weight] of Object.entries(distribution) as [T, number][]) {
		cumulative += weight;
		if (random < cumulative) {
			return key;
		}
	}

	// Fallback to last key
	return Object.keys(distribution)[Object.keys(distribution).length - 1] as T;
}

/**
 * Generate random email from name
 */
export function generateEmail(firstName: string, lastName: string, domain = 'company.com'): string {
	const formats = [
		`${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
		`${firstName.toLowerCase()}${lastName.toLowerCase()}`,
		`${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`,
		`${firstName.toLowerCase()}.${lastName.charAt(0).toLowerCase()}`,
		`${firstName.toLowerCase()}_${lastName.toLowerCase()}`
	];

	const format = getRandomElement(formats);
	const suffix = getRandomInt(1, 999);
	return `${format}${suffix}@${domain}`;
}

/**
 * Generate random phone number
 */
export function generatePhoneNumber(): string {
	const areaCode = getRandomInt(200, 999);
	const prefix = getRandomInt(200, 999);
	const lineNumber = getRandomInt(1000, 9999);
	return `(${areaCode}) ${prefix}-${lineNumber}`;
}

/**
 * Generate random date between two dates
 */
export function generateRandomDate(start: Date, end: Date): Date {
	const startTime = start.getTime();
	const endTime = end.getTime();
	const randomTime = startTime + Math.random() * (endTime - startTime);
	return new Date(randomTime);
}

/**
 * Generate random address
 */
export function generateAddress(): {
	street: string;
	city: string;
	state: string;
	zip: string;
	country: string;
} {
	const streets = ['Main St', 'Oak Ave', 'Elm St', 'Park Blvd', 'First St', 'Washington Ave'];
	const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
	const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA'];

	return {
		street: `${getRandomInt(100, 9999)} ${getRandomElement(streets)}`,
		city: getRandomElement(cities),
		state: getRandomElement(states),
		zip: String(getRandomInt(10000, 99999)),
		country: 'USA'
	};
}