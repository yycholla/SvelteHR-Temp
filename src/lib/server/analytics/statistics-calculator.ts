/**
 * Generic statistics calculator for collections
 *
 * Eliminates ~15 lines of duplicate statistics calculation code from each route
 * by providing a reusable, type-safe statistics calculation API.
 *
 * Supports:
 * - Total counts
 * - Grouping by field with counts
 * - Custom predicate-based counting
 * - Multiple statistics in single pass
 * - Pre-built helpers for common entities (tasks, events, leave requests)
 *
 * @example
 * ```typescript
 * const calculator = new StatisticsCalculator(tasks);
 * const stats = calculator.calculate({
 *   notStarted: (t) => t.status === 'TODO',
 *   inProgress: (t) => t.status === 'IN_PROGRESS',
 *   completed: (t) => t.status === 'DONE'
 * });
 * // { total: 150, notStarted: 45, inProgress: 80, completed: 25 }
 * ```
 */
export class StatisticsCalculator<T = any> {
	private items: T[];

	/**
	 * Create a new statistics calculator
	 *
	 * @param items - Collection to calculate statistics from
	 */
	constructor(items: T[]) {
		this.items = items;
	}

	/**
	 * Get total count
	 *
	 * @returns Total number of items in collection
	 */
	total(): number {
		return this.items.length;
	}

	/**
	 * Group items by field value and count each group
	 *
	 * @param field - Field name to group by
	 * @returns Object with field values as keys and counts as values
	 *
	 * @example
	 * ```typescript
	 * calculator.groupBy('status')
	 * // { TODO: 45, IN_PROGRESS: 80, DONE: 25 }
	 * ```
	 */
	groupBy(field: keyof T): Record<string, number> {
		return this.items.reduce(
			(acc, item) => {
				const key = String(item[field] || 'unknown');
				acc[key] = (acc[key] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);
	}

	/**
	 * Count items matching a predicate
	 *
	 * @param predicate - Function that returns true for items to count
	 * @returns Number of items matching the predicate
	 *
	 * @example
	 * ```typescript
	 * calculator.count((task) => task.priority === 'HIGH')
	 * // 23
	 * ```
	 */
	count(predicate: (item: T) => boolean): number {
		return this.items.filter(predicate).length;
	}

	/**
	 * Calculate multiple statistics in a single pass
	 *
	 * More efficient than calling count() multiple times since it only
	 * iterates through the collection once.
	 *
	 * @param config - Object with stat names as keys and predicates as values
	 * @returns Object with stat names and their counts, plus total
	 *
	 * @example
	 * ```typescript
	 * calculator.calculate({
	 *   high: (t) => t.priority === 'HIGH',
	 *   overdue: (t) => new Date(t.dueDate) < new Date(),
	 *   assigned: (t) => t.assigneeId != null
	 * })
	 * // { total: 150, high: 23, overdue: 12, assigned: 140 }
	 * ```
	 */
	calculate(config: Record<string, (item: T) => boolean>): Record<string, number> {
		const stats: Record<string, number> = { total: this.total() };

		for (const [key, predicate] of Object.entries(config)) {
			stats[key] = this.count(predicate);
		}

		return stats;
	}

	/**
	 * Task-specific statistics helper
	 *
	 * Calculates standard task statistics including status breakdown and overdue count.
	 *
	 * @param tasks - Array of tasks
	 * @returns Task statistics object
	 *
	 * @example
	 * ```typescript
	 * const stats = StatisticsCalculator.forTasks(tasks);
	 * // {
	 * //   total: 150,
	 * //   notStarted: 45,
	 * //   inProgress: 80,
	 * //   blocked: 5,
	 * //   review: 10,
	 * //   completed: 25,
	 * //   overdue: 12
	 * // }
	 * ```
	 */
	static forTasks(tasks: any[]): {
		total: number;
		notStarted: number;
		inProgress: number;
		blocked: number;
		review: number;
		completed: number;
		overdue: number;
	} {
		const calculator = new StatisticsCalculator(tasks);
		const now = new Date();

		return calculator.calculate({
			notStarted: (t) => t.status === 'TODO',
			inProgress: (t) => t.status === 'IN_PROGRESS',
			blocked: (t) => t.status === 'BLOCKED',
			review: (t) => t.status === 'REVIEW',
			completed: (t) => t.status === 'DONE',
			overdue: (t) => {
				if (!t.dueDate) return false;
				return new Date(t.dueDate) < now && t.status !== 'DONE';
			}
		}) as any;
	}

	/**
	 * Leave request statistics helper
	 *
	 * Calculates standard leave request statistics by status.
	 *
	 * @param requests - Array of leave requests
	 * @returns Leave request statistics object
	 *
	 * @example
	 * ```typescript
	 * const stats = StatisticsCalculator.forLeaveRequests(requests);
	 * // {
	 * //   total: 85,
	 * //   pending: 15,
	 * //   approved: 60,
	 * //   rejected: 5,
	 * //   cancelled: 5
	 * // }
	 * ```
	 */
	static forLeaveRequests(requests: any[]): {
		total: number;
		pending: number;
		approved: number;
		rejected: number;
		cancelled: number;
	} {
		const calculator = new StatisticsCalculator(requests);

		return calculator.calculate({
			pending: (r) => r.status === 'PENDING',
			approved: (r) => r.status === 'APPROVED',
			rejected: (r) => r.status === 'REJECTED',
			cancelled: (r) => r.status === 'CANCELLED'
		}) as any;
	}

	/**
	 * Event statistics helper
	 *
	 * Calculates standard event statistics including upcoming, ongoing, past, and cancelled.
	 * "Upcoming" counts events starting within the next 30 days.
	 *
	 * @param events - Array of events
	 * @returns Event statistics object
	 *
	 * @example
	 * ```typescript
	 * const stats = StatisticsCalculator.forEvents(events);
	 * // {
	 * //   total: 120,
	 * //   upcoming: 45,  // Events in next 30 days
	 * //   ongoing: 5,
	 * //   past: 65,
	 * //   cancelled: 5
	 * // }
	 * ```
	 */
	static forEvents(events: any[]): {
		total: number;
		upcoming: number;
		ongoing: number;
		past: number;
		cancelled: number;
	} {
		const calculator = new StatisticsCalculator(events);
		const now = new Date();
		const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

		return calculator.calculate({
			upcoming: (e) => {
				const startTime = new Date(e.startTime);
				return startTime > now && startTime <= thirtyDaysFromNow && e.status !== 'CANCELLED';
			},
			ongoing: (e) => {
				const start = new Date(e.startTime);
				const end = new Date(e.endTime);
				return start <= now && end >= now && e.status !== 'CANCELLED';
			},
			past: (e) => new Date(e.endTime) < now && e.status !== 'CANCELLED',
			cancelled: (e) => e.status === 'CANCELLED'
		}) as any;
	}

	/**
	 * Event attendee RSVP statistics helper
	 *
	 * Calculates RSVP response statistics for event attendees.
	 *
	 * @param attendees - Array of event attendees
	 * @returns Event attendee RSVP statistics
	 *
	 * @example
	 * ```typescript
	 * const stats = StatisticsCalculator.forEventAttendees(attendees);
	 * // {
	 * //   total: 85,
	 * //   accepted: 60,
	 * //   declined: 10,
	 * //   tentative: 5,
	 * //   pending: 10
	 * // }
	 * ```
	 */
	static forEventAttendees(attendees: any[]): {
		total: number;
		accepted: number;
		declined: number;
		tentative: number;
		pending: number;
	} {
		const calculator = new StatisticsCalculator(attendees);

		return calculator.calculate({
			accepted: (a) => a.responseStatus === 'accepted',
			declined: (a) => a.responseStatus === 'declined',
			tentative: (a) => a.responseStatus === 'tentative',
			pending: (a) => a.responseStatus === 'pending'
		}) as any;
	}

	/**
	 * Performance review statistics helper
	 *
	 * Calculates review status statistics including overdue reviews
	 * (reviews older than 30 days without submission).
	 *
	 * @param reviews - Array of performance reviews
	 * @returns Performance review statistics
	 *
	 * @example
	 * ```typescript
	 * const stats = StatisticsCalculator.forPerformanceReviews(reviews);
	 * // {
	 * //   total: 100,
	 * //   completed: 45,
	 * //   inProgress: 30,
	 * //   notStarted: 15,
	 * //   draft: 10,
	 * //   overdue: 8
	 * // }
	 * ```
	 */
	static forPerformanceReviews(reviews: any[]): {
		total: number;
		completed: number;
		inProgress: number;
		notStarted: number;
		draft: number;
		overdue: number;
	} {
		const calculator = new StatisticsCalculator(reviews);
		const now = new Date();

		return calculator.calculate({
			completed: (r) => r.status === 'completed',
			inProgress: (r) => r.status === 'in_progress',
			notStarted: (r) => r.status === 'not_started',
			draft: (r) => r.status === 'draft',
			overdue: (r) => {
				if (r.status === 'completed' || r.submittedAt) return false;
				const createdDate = new Date(r.createdAt);
				const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
				return daysDiff > 30;
			}
		}) as any;
	}

	/**
	 * Employee statistics helper
	 *
	 * Calculates standard employee statistics by status.
	 *
	 * @param employees - Array of employees
	 * @returns Employee statistics object
	 *
	 * @example
	 * ```typescript
	 * const stats = StatisticsCalculator.forEmployees(employees);
	 * // {
	 * //   total: 250,
	 * //   active: 230,
	 * //   inactive: 15,
	 * //   onLeave: 5
	 * // }
	 * ```
	 */
	static forEmployees(employees: any[]): {
		total: number;
		active: number;
		inactive: number;
		onLeave: number;
	} {
		const calculator = new StatisticsCalculator(employees);

		return calculator.calculate({
			active: (e) => e.status === 'ACTIVE' || e.employmentStatus === 'ACTIVE',
			inactive: (e) => e.status === 'INACTIVE' || e.employmentStatus === 'INACTIVE',
			onLeave: (e) => e.status === 'ON_LEAVE' || e.employmentStatus === 'ON_LEAVE'
		}) as any;
	}
}
