import { logger } from '$lib/utils/logger';

export interface User {
	id: string;
	email: string;
	displayName?: string;
	isActive: boolean;
	createdAt: string;
	hireDate?: string;
	departmentId?: string;
	userRoleAssignmentsByUserId?: {
		nodes: Array<{
			userRoleByRoleId: {
				name: string;
				level: number;
				description?: string;
			};
			isActive: boolean;
			createdAt: string;
		}>;
	};
}

// Helper to get user department
export function getUserDepartment(user: User): string {
	// Try to find department from role assignments or other fields if available
	// This is a placeholder logic based on available User interface
	// Ideally User interface should have department info
	return 'Unknown';
}

// Process hire date data by department for LayerChart
export function processHireDepartmentData(users: User[], timeRange: string): any[] {
	logger.info('CHART UTIL: Computing hireDepartmentData', {
		usersLength: users?.length || 0,
		timeRange
	});
	if (!users || users.length === 0) {
		logger.info('CHART UTIL: No users data, returning empty array');
		return [];
	}

	// Calculate date range based on selected timeRange
	const now = new Date();
	let startDate = new Date();

	if (timeRange !== 'all') {
		switch (timeRange) {
			case 'ytd':
				startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
				break;
			case '3m':
				startDate.setMonth(now.getMonth() - 3);
				break;
			case '6m':
				startDate.setMonth(now.getMonth() - 6);
				break;
			case '1y':
				startDate.setFullYear(now.getFullYear() - 1);
				break;
			case '2y':
				startDate.setFullYear(now.getFullYear() - 2);
				break;
		}
	} else {
		// For "all", use the earliest hire date
		startDate = new Date('2015-01-01'); // Conservative start date
	}

	// Filter to only active employees first, then by time range
	const activeUsers = users.filter((user) => {
		if (!user.isActive) return false;

		const hireDate = new Date(user.hireDate || user.createdAt);
		if (isNaN(hireDate.getTime())) return false;

		// Include if hire date is within our range OR if they were hired before and are still active
		return hireDate >= startDate || hireDate <= startDate;
	});
	logger.info('Active users for department analysis:', { count: activeUsers.length });

	// Group active users by month-year and department
	const hiresByMonthAndDept = activeUsers.reduce(
		(acc, user) => {
			try {
				const hireDate = new Date(user.hireDate || user.createdAt);

				// Check if date is valid
				if (isNaN(hireDate.getTime())) {
					logger.warn('Invalid date for user:', { email: user.email });
					return acc;
				}

				// Get department
				const department = getUserDepartment(user);

				// Get the first day of the month for consistent grouping
				const monthStart = new Date(hireDate.getFullYear(), hireDate.getMonth(), 1);
				const monthKey = monthStart.toISOString();

				if (!acc[monthKey]) {
					acc[monthKey] = {
						date: monthStart,
						departments: {}
					};
				}

				if (!acc[monthKey].departments[department]) {
					acc[monthKey].departments[department] = 0;
				}

				acc[monthKey].departments[department] += 1;
			} catch (error) {
				logger.warn('Error processing user:', {
					email: user.email,
					error: error instanceof Error ? error.message : String(error)
				});
			}

			return acc;
		},
		{} as Record<string, any>
	);

	// Get all unique departments
	const allDepartments = new Set<string>();
	Object.values(hiresByMonthAndDept).forEach((month: any) => {
		Object.keys(month.departments).forEach((dept) => allDepartments.add(dept));
	});

	// Sort months by date
	const sortedMonths = Object.values(hiresByMonthAndDept).sort(
		(a: any, b: any) => a.date.getTime() - b.date.getTime()
	);

	// Create cumulative data with all departments
	const result = [];
	const departmentCounts: Record<string, number> = {};

	// Initialize all department counts to 0
	allDepartments.forEach((dept) => {
		departmentCounts[dept] = 0;
	});

	// Calculate employees hired before our start period for each department (baseline)
	const baselineCounts: Record<string, number> = {};
	allDepartments.forEach((dept) => {
		baselineCounts[dept] = 0;
	});

	activeUsers.forEach((user) => {
		const hireDate = new Date(user.hireDate || user.createdAt);
		if (!isNaN(hireDate.getTime()) && hireDate < startDate) {
			const dept = getUserDepartment(user);
			baselineCounts[dept] = (baselineCounts[dept] || 0) + 1;
		}
	});

	// Initialize department counts with baseline
	allDepartments.forEach((dept) => {
		departmentCounts[dept] = baselineCounts[dept] || 0;
	});

	// Add starting point at the selected start date
	const chartStartPoint: any = {
		date: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
		totalEmployees: Object.values(departmentCounts).reduce(
			(sum: number, count: number) => sum + count,
			0
		)
	};

	// Add all departments with baseline count
	allDepartments.forEach((dept) => {
		chartStartPoint[dept] = departmentCounts[dept];
	});

	result.push(chartStartPoint);

	// Process each month and make cumulative, but only for months within our range
	sortedMonths.forEach((month: any) => {
		if (month.date >= startDate) {
			// Update cumulative counts for each department
			Object.keys(month.departments).forEach((dept) => {
				departmentCounts[dept] += month.departments[dept];
			});

			const dataPoint: any = {
				date: month.date,
				totalEmployees: Object.values(departmentCounts).reduce(
					(sum: number, count: number) => sum + count,
					0
				)
			};

			// Add each department's cumulative count
			allDepartments.forEach((dept) => {
				dataPoint[dept] = departmentCounts[dept];
			});

			result.push(dataPoint);
		}
	});

	// Add current month point to extend chart to present
	const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastDataDate = result.length > 0 ? result[result.length - 1].date : chartStartPoint.date;

	if (currentMonth.getTime() > lastDataDate.getTime()) {
		const currentPoint: any = {
			date: currentMonth,
			totalEmployees: Object.values(departmentCounts).reduce(
				(sum: number, count: number) => sum + count,
				0
			)
		};

		// Add each department's current count
		allDepartments.forEach((dept) => {
			currentPoint[dept] = departmentCounts[dept];
		});

		result.push(currentPoint);
	}

	logger.info('Final hireDepartmentData:', { result });
	return result;
}
