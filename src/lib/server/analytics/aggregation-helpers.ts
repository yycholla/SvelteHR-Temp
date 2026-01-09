/**
 * Common aggregation functions for numeric data
 *
 * Provides reusable aggregation utilities for calculating sums, averages,
 * min/max values, and percentiles across collections.
 *
 * @example
 * ```typescript
 * const totalHours = Aggregators.sum(tasks, 'estimatedHours');
 * const avgCompletion = Aggregators.average(tasks, 'completionPercentage');
 * const maxPriority = Aggregators.max(tasks, 'priorityLevel');
 * ```
 */

/**
 * Collection of aggregation utilities
 */
export const Aggregators = {
	/**
	 * Sum numeric field across collection
	 *
	 * Safely handles non-numeric values by treating them as 0.
	 *
	 * @param items - Collection to aggregate
	 * @param field - Numeric field to sum
	 * @returns Sum of all numeric values
	 *
	 * @example
	 * ```typescript
	 * const totalSalary = Aggregators.sum(employees, 'salary');
	 * // 1250000
	 * ```
	 */
	sum: <T>(items: T[], field: keyof T): number => {
		return items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
	},

	/**
	 * Calculate average of numeric field
	 *
	 * Returns 0 for empty collections.
	 * Safely handles non-numeric values by treating them as 0.
	 *
	 * @param items - Collection to aggregate
	 * @param field - Numeric field to average
	 * @returns Average value or 0 if collection is empty
	 *
	 * @example
	 * ```typescript
	 * const avgAge = Aggregators.average(employees, 'age');
	 * // 32.5
	 * ```
	 */
	average: <T>(items: T[], field: keyof T): number => {
		if (items.length === 0) return 0;
		return Aggregators.sum(items, field) / items.length;
	},

	/**
	 * Find minimum value in field
	 *
	 * Returns 0 if collection is empty or all values are non-numeric.
	 *
	 * @param items - Collection to aggregate
	 * @param field - Numeric field to find minimum of
	 * @returns Minimum value or 0
	 *
	 * @example
	 * ```typescript
	 * const minSalary = Aggregators.min(employees, 'salary');
	 * // 35000
	 * ```
	 */
	min: <T>(items: T[], field: keyof T): number => {
		const values = items
			.filter((item) => item[field] != null) // Filter out null/undefined first
			.map((item) => Number(item[field]))
			.filter((n) => !isNaN(n));
		return values.length > 0 ? Math.min(...values) : 0;
	},

	/**
	 * Find maximum value in field
	 *
	 * Returns 0 if collection is empty or all values are non-numeric.
	 *
	 * @param items - Collection to aggregate
	 * @param field - Numeric field to find maximum of
	 * @returns Maximum value or 0
	 *
	 * @example
	 * ```typescript
	 * const maxSalary = Aggregators.max(employees, 'salary');
	 * // 180000
	 * ```
	 */
	max: <T>(items: T[], field: keyof T): number => {
		const values = items
			.filter((item) => item[field] != null) // Filter out null/undefined first
			.map((item) => Number(item[field]))
			.filter((n) => !isNaN(n));
		return values.length > 0 ? Math.max(...values) : 0;
	},

	/**
	 * Calculate median value
	 *
	 * Returns 0 if collection is empty.
	 *
	 * @param items - Collection to aggregate
	 * @param field - Numeric field to find median of
	 * @returns Median value or 0
	 *
	 * @example
	 * ```typescript
	 * const medianSalary = Aggregators.median(employees, 'salary');
	 * // 55000
	 * ```
	 */
	median: <T>(items: T[], field: keyof T): number => {
		const values = items
			.filter((item) => item[field] != null) // Filter out null/undefined first
			.map((item) => Number(item[field]))
			.filter((n) => !isNaN(n))
			.sort((a, b) => a - b);

		if (values.length === 0) return 0;

		const mid = Math.floor(values.length / 2);

		if (values.length % 2 === 0) {
			// Even number of items - average of two middle values
			return (values[mid - 1] + values[mid]) / 2;
		} else {
			// Odd number of items - middle value
			return values[mid];
		}
	},

	/**
	 * Calculate standard deviation
	 *
	 * Returns 0 if collection is empty.
	 *
	 * @param items - Collection to aggregate
	 * @param field - Numeric field to calculate standard deviation for
	 * @returns Standard deviation or 0
	 *
	 * @example
	 * ```typescript
	 * const salaryStdDev = Aggregators.standardDeviation(employees, 'salary');
	 * // 23450.5
	 * ```
	 */
	standardDeviation: <T>(items: T[], field: keyof T): number => {
		if (items.length === 0) return 0;

		const avg = Aggregators.average(items, field);
		const squareDiffs = items.map((item) => {
			const value = Number(item[field]) || 0;
			const diff = value - avg;
			return diff * diff;
		});

		const avgSquareDiff = squareDiffs.reduce((sum, sq) => sum + sq, 0) / items.length;
		return Math.sqrt(avgSquareDiff);
	},

	/**
	 * Calculate percentile value
	 *
	 * Returns 0 if collection is empty.
	 *
	 * @param items - Collection to aggregate
	 * @param field - Numeric field to calculate percentile for
	 * @param percentile - Percentile to calculate (0-100)
	 * @returns Value at the given percentile or 0
	 *
	 * @example
	 * ```typescript
	 * const p90Salary = Aggregators.percentile(employees, 'salary', 90);
	 * // 95000 (90th percentile salary)
	 * ```
	 */
	percentile: <T>(items: T[], field: keyof T, percentile: number): number => {
		if (items.length === 0) return 0;
		if (percentile < 0 || percentile > 100) {
			throw new Error('Percentile must be between 0 and 100');
		}

		const values = items
			.filter((item) => item[field] != null) // Filter out null/undefined first
			.map((item) => Number(item[field]))
			.filter((n) => !isNaN(n))
			.sort((a, b) => a - b);

		if (values.length === 0) return 0;

		const index = (percentile / 100) * (values.length - 1);
		const lower = Math.floor(index);
		const upper = Math.ceil(index);

		if (lower === upper) {
			return values[lower];
		}

		// Linear interpolation between two values
		const fraction = index - lower;
		return values[lower] * (1 - fraction) + values[upper] * fraction;
	},

	/**
	 * Count distinct values in field
	 *
	 * @param items - Collection to aggregate
	 * @param field - Field to count distinct values for
	 * @returns Number of distinct values
	 *
	 * @example
	 * ```typescript
	 * const uniqueDepartments = Aggregators.countDistinct(employees, 'departmentId');
	 * // 8
	 * ```
	 */
	countDistinct: <T>(items: T[], field: keyof T): number => {
		const uniqueValues = new Set(items.map((item) => item[field]));
		return uniqueValues.size;
	},

	/**
	 * Group and aggregate by field
	 *
	 * Groups items by a field and applies an aggregation function to each group.
	 *
	 * @param items - Collection to aggregate
	 * @param groupByField - Field to group by
	 * @param aggregateField - Field to aggregate within each group
	 * @param aggregateFn - Aggregation function to apply
	 * @returns Object with group keys and aggregated values
	 *
	 * @example
	 * ```typescript
	 * const avgSalaryByDept = Aggregators.groupAndAggregate(
	 *   employees,
	 *   'department',
	 *   'salary',
	 *   Aggregators.average
	 * );
	 * // { Engineering: 85000, Sales: 65000, HR: 55000 }
	 * ```
	 */
	groupAndAggregate: <T>(
		items: T[],
		groupByField: keyof T,
		aggregateField: keyof T,
		aggregateFn: (items: T[], field: keyof T) => number
	): Record<string, number> => {
		const grouped = items.reduce(
			(acc, item) => {
				const key = String(item[groupByField] || 'unknown');
				if (!acc[key]) {
					acc[key] = [];
				}
				acc[key].push(item);
				return acc;
			},
			{} as Record<string, T[]>
		);

		const result: Record<string, number> = {};
		for (const [key, groupItems] of Object.entries(grouped)) {
			result[key] = aggregateFn(groupItems, aggregateField);
		}

		return result;
	}
};
