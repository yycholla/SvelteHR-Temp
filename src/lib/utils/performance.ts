import type {
	PerformanceReview,
	PerformanceReviewFilter,
	PerformanceStatistics
} from '$lib/types/performance';

/**
 * Helper: Build performance review filter safely
 */
export function buildPerformanceReviewFilter({
	status,
	employeeId,
	employeeName,
	reviewerId,
	reviewPeriod,
	departmentId,
	minRating,
	maxRating
}: {
	status?: 'draft' | 'in_progress' | 'completed' | 'overdue';
	employeeId?: string;
	employeeName?: string;
	reviewerId?: string;
	reviewPeriod?: string;
	departmentId?: string;
	minRating?: number;
	maxRating?: number;
}): PerformanceReviewFilter {
	const filter: PerformanceReviewFilter = {};

	if (status) {
		filter.status = { equalTo: status };
	}

	if (employeeId) {
		filter.employeeId = { equalTo: employeeId };
	}

	if (reviewerId) {
		filter.reviewerId = { equalTo: reviewerId };
	}

	if (reviewPeriod) {
		filter.reviewPeriod = { includesInsensitive: reviewPeriod };
	}

	if (employeeName || departmentId) {
		filter.employee = {};
		if (employeeName) {
			filter.employee.displayName = { includesInsensitive: employeeName };
		}
		if (departmentId) {
			filter.employee.departmentId = { equalTo: departmentId };
		}
	}

	if (minRating !== undefined || maxRating !== undefined) {
		filter.overallRating = {};
		if (minRating !== undefined) {
			filter.overallRating.greaterThanOrEqualTo = minRating;
		}
		if (maxRating !== undefined) {
			filter.overallRating.lessThanOrEqualTo = maxRating;
		}
	}

	return filter;
}

/**
 * Helper: Calculate performance statistics from raw data
 */
export function calculatePerformanceStatistics(data: {
	totalReviews: { totalCount: number };
	completedReviews: {
		totalCount: number;
		nodes: Array<{
			overallRating: number;
			goalsAchievement: number;
			collaboration: number;
			communication: number;
			leadership: number;
			technicalSkills?: number;
		}>;
	};
	inProgressReviews: { totalCount: number };
	overdueReviews: { totalCount: number };
}): PerformanceStatistics {
	const totalCount = data.totalReviews.totalCount;
	const completedCount = data.completedReviews.totalCount;
	const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	// Calculate average ratings from completed reviews
	const completedNodes = data.completedReviews.nodes;
	const averageRatings = {
		overall: 0,
		goalsAchievement: 0,
		collaboration: 0,
		communication: 0,
		leadership: 0,
		technicalSkills: 0
	};

	if (completedCount > 0) {
		const sums = completedNodes.reduce(
			(acc, review) => ({
				overall: acc.overall + review.overallRating,
				goalsAchievement: acc.goalsAchievement + review.goalsAchievement,
				collaboration: acc.collaboration + review.collaboration,
				communication: acc.communication + review.communication,
				leadership: acc.leadership + review.leadership,
				technicalSkills: acc.technicalSkills + (review.technicalSkills || 0)
			}),
			{
				overall: 0,
				goalsAchievement: 0,
				collaboration: 0,
				communication: 0,
				leadership: 0,
				technicalSkills: 0
			}
		);

		averageRatings.overall = parseFloat((sums.overall / completedCount).toFixed(2));
		averageRatings.goalsAchievement = parseFloat(
			(sums.goalsAchievement / completedCount).toFixed(2)
		);
		averageRatings.collaboration = parseFloat((sums.collaboration / completedCount).toFixed(2));
		averageRatings.communication = parseFloat((sums.communication / completedCount).toFixed(2));
		averageRatings.leadership = parseFloat((sums.leadership / completedCount).toFixed(2));
		averageRatings.technicalSkills = parseFloat((sums.technicalSkills / completedCount).toFixed(2));
	}

	// Calculate rating distribution (1.0-5.0 in 0.5 increments)
	const ratingCounts = new Map<number, number>();
	completedNodes.forEach((review) => {
		const rating = Math.round(review.overallRating * 2) / 2; // Round to nearest 0.5
		ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1);
	});

	const ratingDistribution = Array.from(ratingCounts.entries())
		.map(([rating, count]) => ({
			rating,
			count,
			percentage: completedCount > 0 ? Math.round((count / completedCount) * 100) : 0
		}))
		.sort((a, b) => b.rating - a.rating);

	return {
		totalReviews: totalCount,
		completedReviews: completedCount,
		inProgressReviews: data.inProgressReviews.totalCount,
		overdueReviews: data.overdueReviews.totalCount,
		completionRate,
		averageRatings,
		ratingDistribution
	};
}

/**
 * Helper: Validate rating value (must be between 1.0 and 5.0)
 */
export function validateRating(
	ratingName: string,
	rating: number
): { valid: boolean; error?: string } {
	if (rating < 1.0 || rating > 5.0) {
		return {
			valid: false,
			error: `${ratingName} must be between 1.0 and 5.0`
		};
	}
	return { valid: true };
}

/**
 * Helper: Validate performance review input
 */
export function validatePerformanceReviewInput(input: {
	overallRating: number;
	goalsAchievement: number;
	collaboration: number;
	communication: number;
	leadership: number;
	technicalSkills?: number;
	strengths: string;
	areasForImprovement: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Validate all ratings
	const ratings = [
		{ name: 'Overall Rating', value: input.overallRating },
		{ name: 'Goals Achievement', value: input.goalsAchievement },
		{ name: 'Collaboration', value: input.collaboration },
		{ name: 'Communication', value: input.communication },
		{ name: 'Leadership', value: input.leadership }
	];

	if (input.technicalSkills !== undefined) {
		ratings.push({ name: 'Technical Skills', value: input.technicalSkills });
	}

	ratings.forEach(({ name, value }) => {
		const validation = validateRating(name, value);
		if (!validation.valid) {
			errors.push(validation.error!);
		}
	});

	// Validate text fields
	if (!input.strengths || input.strengths.trim().length === 0) {
		errors.push('Strengths field is required');
	}

	if (!input.areasForImprovement || input.areasForImprovement.trim().length === 0) {
		errors.push('Areas for Improvement field is required');
	}

	if (input.strengths && input.strengths.length > 2000) {
		errors.push('Strengths must be less than 2000 characters');
	}

	if (input.areasForImprovement && input.areasForImprovement.length > 2000) {
		errors.push('Areas for Improvement must be less than 2000 characters');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Get rating badge color based on value
 */
export function getRatingBadgeColor(rating: number): string {
	if (rating >= 4.5) return 'green';
	if (rating >= 3.5) return 'blue';
	if (rating >= 2.5) return 'yellow';
	return 'red';
}

/**
 * Helper: Get status badge color
 */
export function getReviewStatusBadgeColor(status: string): string {
	const statusColors: Record<string, string> = {
		draft: 'gray',
		in_progress: 'blue',
		completed: 'green',
		overdue: 'red'
	};
	return statusColors[status.toLowerCase()] || 'gray';
}

/**
 * Helper: Format review period (e.g., "Q4 2025")
 */
export function formatReviewPeriod(period: string): string {
	// Handle formats like "Q4 2025", "2025-Q4", "2025-10-01 to 2025-12-31"
	if (period.match(/Q\d \d{4}/)) return period; // Already formatted
	if (period.match(/\d{4}-Q\d/)) {
		const [year, quarter] = period.split('-');
		return `${quarter} ${year}`;
	}
	return period;
}

/**
 * Helper: Check if review is overdue
 */
export function isReviewOverdue(review: Partial<PerformanceReview>): boolean {
	if (!review || review.status === 'completed') return false;

	// If review has a review date in the past and not completed, it's overdue
	if (review.reviewDate) {
		return new Date(review.reviewDate) < new Date();
	}

	return false;
}

/**
 * Helper: Get status info for review (includes overdue detection)
 */
export function getStatusInfo(review: Partial<PerformanceReview>): {
	status: string;
	variant: string;
} {
	if (isReviewOverdue(review)) {
		return { status: 'overdue', variant: 'destructive' };
	}

	const status = review.status || 'draft';

	const statusMap: Record<string, { status: string; variant: string }> = {
		draft: { status: 'draft', variant: 'secondary' },
		in_progress: { status: 'in progress', variant: 'default' },
		completed: { status: 'completed', variant: 'success' },
		overdue: { status: 'overdue', variant: 'destructive' }
	};

	return statusMap[status] || { status: status, variant: 'default' };
}
