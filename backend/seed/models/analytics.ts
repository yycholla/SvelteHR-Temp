/**
 * Analytics Snapshot Seed Data Model
 * Generates realistic analytics data for dashboards and reporting
 */

export interface AnalyticsSnapshot {
	id: string;
	nodeId: string;
	snapshotDate: string;
	snapshotType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

	// Employee metrics
	totalEmployees: number;
	activeEmployees: number;
	newHires: number;
	terminations: number;
	turnoverRate: number; // percentage

	// Department metrics
	departmentCounts: DepartmentCount[];
	departmentGrowth: DepartmentGrowth[];

	// Performance metrics
	averagePerformanceRating: number;
	performanceDistribution: PerformanceDistribution[];
	goalCompletionRate: number; // percentage
	reviewsCompleted: number;
	reviewsOverdue: number;

	// Leave and attendance metrics
	totalLeaveRequests: number;
	approvedLeaveRequests: number;
	pendingLeaveRequests: number;
	rejectedLeaveRequests: number;
	averageLeaveApprovalTime: number; // hours
	totalLeaveDaysTaken: number;
	attendanceRate: number; // percentage

	// Engagement metrics
	satisfactionScore: number; // 1-10 scale
	engagementScore: number; // 1-10 scale
	retentionRate: number; // percentage

	// Compensation metrics
	averageSalary: number;
	salaryRangeDistribution: SalaryRangeDistribution[];
	totalPayrollCost: number;

	// Training and development metrics
	trainingHoursCompleted: number;
	certificationsEarned: number;
	skillDevelopmentProgress: number; // percentage

	// Diversity metrics
	genderDistribution: GenderDistribution[];
	ageDistribution: AgeDistribution[];
	tenureDistribution: TenureDistribution[];

	// Timestamp metadata
	createdAt: string;
	updatedAt: string;
	generatedBy: string;
}

export interface DepartmentCount {
	departmentId: number;
	departmentName: string;
	employeeCount: number;
	percentage: number;
}

export interface DepartmentGrowth {
	departmentId: number;
	departmentName: string;
	previousCount: number;
	currentCount: number;
	growthRate: number; // percentage
	growthAbsolute: number;
}

export interface PerformanceDistribution {
	rating: number; // 1-5
	count: number;
	percentage: number;
}

export interface SalaryRangeDistribution {
	range: string; // e.g., "50k-60k"
	count: number;
	percentage: number;
	averageSalary: number;
}

export interface GenderDistribution {
	gender: string;
	count: number;
	percentage: number;
}

export interface AgeDistribution {
	ageRange: string; // e.g., "25-34"
	count: number;
	percentage: number;
}

export interface TenureDistribution {
	tenureRange: string; // e.g., "1-2 years"
	count: number;
	percentage: number;
}

export interface AnalyticsQuery {
	id: string;
	queryName: string;
	description: string;
	sqlQuery: string;
	parameters: Record<string, any>;
	resultSchema: string;
	isActive: boolean;
	createdBy: number;
	createdAt: string;
	lastRun?: string;
	runCount: number;
}

/**
 * Generate realistic analytics data
 */
export class AnalyticsGenerator {
	private readonly departments = [
		{ id: 1, name: 'Engineering', weight: 35 },
		{ id: 2, name: 'Sales', weight: 20 },
		{ id: 3, name: 'Marketing', weight: 15 },
		{ id: 4, name: 'HR', weight: 10 },
		{ id: 5, name: 'Finance', weight: 10 },
		{ id: 6, name: 'Operations', weight: 10 }
	];

	private readonly salaryRanges = [
		{ range: '40k-50k', min: 40000, max: 50000, weight: 10 },
		{ range: '50k-60k', min: 50000, max: 60000, weight: 15 },
		{ range: '60k-80k', min: 60000, max: 80000, weight: 25 },
		{ range: '80k-100k', min: 80000, max: 100000, weight: 20 },
		{ range: '100k-120k', min: 100000, max: 120000, weight: 15 },
		{ range: '120k-150k', min: 120000, max: 150000, weight: 10 },
		{ range: '150k+', min: 150000, max: 200000, weight: 5 }
	];

	private readonly ageRanges = [
		{ range: '22-24', min: 22, max: 24, weight: 8 },
		{ range: '25-29', min: 25, max: 29, weight: 25 },
		{ range: '30-34', min: 30, max: 34, weight: 22 },
		{ range: '35-39', min: 35, max: 39, weight: 18 },
		{ range: '40-44', min: 40, max: 44, weight: 12 },
		{ range: '45-49', min: 45, max: 49, weight: 8 },
		{ range: '50-54', min: 50, max: 54, weight: 5 },
		{ range: '55+', min: 55, max: 65, weight: 2 }
	];

	private readonly tenureRanges = [
		{ range: '0-6 months', min: 0, max: 0.5, weight: 15 },
		{ range: '6-12 months', min: 0.5, max: 1, weight: 12 },
		{ range: '1-2 years', min: 1, max: 2, weight: 20 },
		{ range: '2-3 years', min: 2, max: 3, weight: 18 },
		{ range: '3-5 years', min: 3, max: 5, weight: 15 },
		{ range: '5-10 years', min: 5, max: 10, weight: 12 },
		{ range: '10+ years', min: 10, max: 25, weight: 8 }
	];

	/**
	 * Generate analytics snapshots for different time periods
	 */
	generateAnalyticsSnapshots(count: number, totalEmployees: number = 150): AnalyticsSnapshot[] {
		const snapshots: AnalyticsSnapshot[] = [];
		const now = new Date();

		for (let i = 0; i < count; i++) {
			// Generate date going backwards from now
			const daysBack = i * 30; // Monthly snapshots
			const snapshotDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

			// Adjust employee count slightly for historical data
			const employeeCount = Math.floor(totalEmployees * (0.8 + Math.random() * 0.4));

			const snapshot: AnalyticsSnapshot = {
				id: `analytics_${i + 1}`,
				nodeId: `node_analytics_${i + 1}`,
				snapshotDate: snapshotDate.toISOString().split('T')[0],
				snapshotType: 'monthly',

				// Employee metrics
				totalEmployees: employeeCount,
				activeEmployees: Math.floor(employeeCount * (0.95 + Math.random() * 0.05)),
				newHires: Math.floor(Math.random() * 8) + 2,
				terminations: Math.floor(Math.random() * 5) + 1,
				turnoverRate: Number((Math.random() * 8 + 2).toFixed(1)), // 2-10%

				// Department metrics
				departmentCounts: this.generateDepartmentCounts(employeeCount),
				departmentGrowth: this.generateDepartmentGrowth(employeeCount),

				// Performance metrics
				averagePerformanceRating: Number((Math.random() * 1.5 + 3.5).toFixed(1)), // 3.5-5.0
				performanceDistribution: this.generatePerformanceDistribution(),
				goalCompletionRate: Number((Math.random() * 30 + 65).toFixed(1)), // 65-95%
				reviewsCompleted: Math.floor(employeeCount * (0.7 + Math.random() * 0.25)),
				reviewsOverdue: Math.floor(employeeCount * Math.random() * 0.1),

				// Leave and attendance metrics
				totalLeaveRequests: Math.floor(employeeCount * (0.4 + Math.random() * 0.3)),
				approvedLeaveRequests: 0, // Will be calculated
				pendingLeaveRequests: 0,
				rejectedLeaveRequests: 0,
				averageLeaveApprovalTime: Number((Math.random() * 48 + 24).toFixed(1)), // 24-72 hours
				totalLeaveDaysTaken: Math.floor(employeeCount * (8 + Math.random() * 4)), // 8-12 days per person
				attendanceRate: Number((Math.random() * 5 + 95).toFixed(1)), // 95-100%

				// Engagement metrics
				satisfactionScore: Number((Math.random() * 2 + 7).toFixed(1)), // 7-9
				engagementScore: Number((Math.random() * 2 + 7.5).toFixed(1)), // 7.5-9.5
				retentionRate: Number((Math.random() * 10 + 88).toFixed(1)), // 88-98%

				// Compensation metrics
				averageSalary: Math.floor(Math.random() * 30000 + 75000), // 75k-105k
				salaryRangeDistribution: this.generateSalaryDistribution(employeeCount),
				totalPayrollCost: 0, // Will be calculated

				// Training and development metrics
				trainingHoursCompleted: Math.floor(employeeCount * (15 + Math.random() * 25)), // 15-40 hours per person
				certificationsEarned: Math.floor(employeeCount * Math.random() * 0.3), // 0-30% of employees
				skillDevelopmentProgress: Number((Math.random() * 20 + 70).toFixed(1)), // 70-90%

				// Diversity metrics
				genderDistribution: this.generateGenderDistribution(employeeCount),
				ageDistribution: this.generateAgeDistribution(employeeCount),
				tenureDistribution: this.generateTenureDistribution(employeeCount),

				// Metadata
				createdAt: snapshotDate.toISOString(),
				updatedAt: snapshotDate.toISOString(),
				generatedBy: 'system'
			};

			// Calculate derived metrics
			this.calculateDerivedMetrics(snapshot);

			snapshots.push(snapshot);
		}

		return snapshots.sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime());
	}

	/**
	 * Generate pre-defined analytics queries
	 */
	generateAnalyticsQueries(creatorIds: number[]): AnalyticsQuery[] {
		const queries: AnalyticsQuery[] = [
			{
				id: 'query_department_performance',
				queryName: 'Department Performance Overview',
				description: 'Performance metrics by department including average ratings and goal completion',
				sqlQuery: `
					SELECT
						d.name as department_name,
						COUNT(e.id) as employee_count,
						AVG(pr.overall_rating) as avg_performance,
						COUNT(g.id) FILTER (WHERE g.status = 'completed') * 100.0 / COUNT(g.id) as goal_completion_rate
					FROM departments d
					LEFT JOIN employees e ON d.id = e.department_id
					LEFT JOIN performance_reviews pr ON e.id = pr.employee_id
					LEFT JOIN goals g ON e.id = g.employee_id
					WHERE pr.created_at >= $1 AND pr.created_at <= $2
					GROUP BY d.id, d.name
					ORDER BY avg_performance DESC
				`,
				parameters: { start_date: 'date', end_date: 'date' },
				resultSchema: 'DepartmentPerformanceResult',
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
				runCount: Math.floor(Math.random() * 50) + 10
			},
			{
				id: 'query_turnover_analysis',
				queryName: 'Employee Turnover Analysis',
				description: 'Detailed turnover analysis by department, tenure, and performance',
				sqlQuery: `
					SELECT
						d.name as department_name,
						DATE_TRUNC('month', e.termination_date) as termination_month,
						COUNT(*) as termination_count,
						AVG(EXTRACT(days FROM (e.termination_date - e.hire_date)) / 365.25) as avg_tenure_years,
						AVG(pr.overall_rating) as avg_performance_rating
					FROM employees e
					JOIN departments d ON e.department_id = d.id
					LEFT JOIN performance_reviews pr ON e.id = pr.employee_id
					WHERE e.termination_date IS NOT NULL
						AND e.termination_date >= $1
						AND e.termination_date <= $2
					GROUP BY d.name, DATE_TRUNC('month', e.termination_date)
					ORDER BY termination_month DESC, termination_count DESC
				`,
				parameters: { start_date: 'date', end_date: 'date' },
				resultSchema: 'TurnoverAnalysisResult',
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
				runCount: Math.floor(Math.random() * 30) + 5
			},
			{
				id: 'query_leave_trends',
				queryName: 'Leave Request Trends',
				description: 'Analysis of leave request patterns and approval rates',
				sqlQuery: `
					SELECT
						leave_type,
						DATE_TRUNC('month', start_date) as leave_month,
						COUNT(*) as total_requests,
						COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
						COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
						COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
						AVG(days_requested) as avg_days_requested,
						AVG(EXTRACT(hours FROM (updated_at - created_at))) as avg_approval_time_hours
					FROM leave_requests
					WHERE start_date >= $1 AND start_date <= $2
					GROUP BY leave_type, DATE_TRUNC('month', start_date)
					ORDER BY leave_month DESC, total_requests DESC
				`,
				parameters: { start_date: 'date', end_date: 'date' },
				resultSchema: 'LeaveTrendsResult',
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
				runCount: Math.floor(Math.random() * 40) + 15
			},
			{
				id: 'query_compensation_equity',
				queryName: 'Compensation Equity Analysis',
				description: 'Analysis of compensation equity across departments, roles, and demographics',
				sqlQuery: `
					SELECT
						d.name as department_name,
						e.job_title,
						e.gender,
						COUNT(*) as employee_count,
						AVG(c.base_salary) as avg_base_salary,
						PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY c.base_salary) as median_salary,
						MIN(c.base_salary) as min_salary,
						MAX(c.base_salary) as max_salary,
						STDDEV(c.base_salary) as salary_stddev
					FROM employees e
					JOIN departments d ON e.department_id = d.id
					JOIN compensation c ON e.id = c.employee_id
					WHERE c.effective_date <= $1 AND (c.end_date IS NULL OR c.end_date > $1)
					GROUP BY d.name, e.job_title, e.gender
					HAVING COUNT(*) >= 3
					ORDER BY department_name, job_title, gender
				`,
				parameters: { as_of_date: 'date' },
				resultSchema: 'CompensationEquityResult',
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
				runCount: Math.floor(Math.random() * 25) + 8
			},
			{
				id: 'query_goal_effectiveness',
				queryName: 'Goal Setting Effectiveness',
				description: 'Analysis of goal completion rates and their impact on performance',
				sqlQuery: `
					SELECT
						g.category,
						g.priority,
						COUNT(*) as total_goals,
						COUNT(*) FILTER (WHERE g.status = 'completed') as completed_goals,
						COUNT(*) FILTER (WHERE g.status = 'completed') * 100.0 / COUNT(*) as completion_rate,
						AVG(g.progress) as avg_progress,
						AVG(pr.overall_rating) as avg_performance_rating,
						CORR(g.progress, pr.overall_rating) as progress_performance_correlation
					FROM goals g
					JOIN employees e ON g.employee_id = e.id
					LEFT JOIN performance_reviews pr ON e.id = pr.employee_id
					WHERE g.created_at >= $1 AND g.created_at <= $2
					GROUP BY g.category, g.priority
					ORDER BY completion_rate DESC, avg_performance_rating DESC
				`,
				parameters: { start_date: 'date', end_date: 'date' },
				resultSchema: 'GoalEffectivenessResult',
				isActive: true,
				createdBy: creatorIds[0],
				createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
				runCount: Math.floor(Math.random() * 35) + 12
			}
		];

		// Add last run dates for some queries
		queries.forEach(query => {
			if (Math.random() > 0.3) {
				query.lastRun = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
			}
		});

		return queries;
	}

	private generateDepartmentCounts(totalEmployees: number): DepartmentCount[] {
		const counts: DepartmentCount[] = [];
		let remaining = totalEmployees;

		this.departments.forEach((dept, index) => {
			const isLast = index === this.departments.length - 1;
			const count = isLast ? remaining : Math.floor(totalEmployees * dept.weight / 100);
			remaining -= count;

			counts.push({
				departmentId: dept.id,
				departmentName: dept.name,
				employeeCount: count,
				percentage: Number(((count / totalEmployees) * 100).toFixed(1))
			});
		});

		return counts;
	}

	private generateDepartmentGrowth(currentTotal: number): DepartmentGrowth[] {
		return this.departments.map(dept => {
			const currentCount = Math.floor(currentTotal * dept.weight / 100);
			const previousCount = Math.floor(currentCount * (0.85 + Math.random() * 0.3)); // ±15% variation
			const growthAbsolute = currentCount - previousCount;
			const growthRate = previousCount > 0 ? Number(((growthAbsolute / previousCount) * 100).toFixed(1)) : 0;

			return {
				departmentId: dept.id,
				departmentName: dept.name,
				previousCount,
				currentCount,
				growthRate,
				growthAbsolute
			};
		});
	}

	private generatePerformanceDistribution(): PerformanceDistribution[] {
		// Typical performance distribution (slightly skewed toward higher ratings)
		const ratings = [
			{ rating: 1, weight: 2 },
			{ rating: 2, weight: 8 },
			{ rating: 3, weight: 25 },
			{ rating: 4, weight: 45 },
			{ rating: 5, weight: 20 }
		];

		const totalWeight = ratings.reduce((sum, r) => sum + r.weight, 0);

		return ratings.map(rating => ({
			rating: rating.rating,
			count: Math.floor(Math.random() * 20) + 5, // 5-25 people per rating
			percentage: rating.weight
		}));
	}

	private generateSalaryDistribution(totalEmployees: number): SalaryRangeDistribution[] {
		return this.salaryRanges.map(range => {
			const count = Math.floor(totalEmployees * range.weight / 100);
			const avgSalary = Math.floor(range.min + Math.random() * (range.max - range.min));

			return {
				range: range.range,
				count,
				percentage: Number(((count / totalEmployees) * 100).toFixed(1)),
				averageSalary: avgSalary
			};
		});
	}

	private generateGenderDistribution(totalEmployees: number): GenderDistribution[] {
		const distributions = [
			{ gender: 'Male', percentage: 45 + Math.random() * 20 }, // 45-65%
			{ gender: 'Female', percentage: 0 }, // Will be calculated
			{ gender: 'Non-binary', percentage: Math.random() * 3 }, // 0-3%
			{ gender: 'Prefer not to say', percentage: Math.random() * 2 } // 0-2%
		];

		// Calculate female percentage to make total 100%
		const otherPercentages = distributions[0].percentage + distributions[2].percentage + distributions[3].percentage;
		distributions[1].percentage = 100 - otherPercentages;

		return distributions.map(dist => ({
			gender: dist.gender,
			count: Math.floor(totalEmployees * dist.percentage / 100),
			percentage: Number(dist.percentage.toFixed(1))
		}));
	}

	private generateAgeDistribution(totalEmployees: number): AgeDistribution[] {
		return this.ageRanges.map(range => {
			const count = Math.floor(totalEmployees * range.weight / 100);
			return {
				ageRange: range.range,
				count,
				percentage: Number(((count / totalEmployees) * 100).toFixed(1))
			};
		});
	}

	private generateTenureDistribution(totalEmployees: number): TenureDistribution[] {
		return this.tenureRanges.map(range => {
			const count = Math.floor(totalEmployees * range.weight / 100);
			return {
				tenureRange: range.range,
				count,
				percentage: Number(((count / totalEmployees) * 100).toFixed(1))
			};
		});
	}

	private calculateDerivedMetrics(snapshot: AnalyticsSnapshot): void {
		// Calculate leave request breakdown
		const totalLeave = snapshot.totalLeaveRequests;
		snapshot.approvedLeaveRequests = Math.floor(totalLeave * (0.6 + Math.random() * 0.25)); // 60-85%
		snapshot.pendingLeaveRequests = Math.floor(totalLeave * (0.1 + Math.random() * 0.15)); // 10-25%
		snapshot.rejectedLeaveRequests = totalLeave - snapshot.approvedLeaveRequests - snapshot.pendingLeaveRequests;

		// Calculate total payroll cost
		snapshot.totalPayrollCost = snapshot.salaryRangeDistribution.reduce((total, range) => {
			return total + (range.count * range.averageSalary);
		}, 0);
	}
}

/**
 * Default export for easy importing
 */
export default new AnalyticsGenerator();