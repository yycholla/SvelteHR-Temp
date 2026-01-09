/**
 * Review Operations - Frontend Helper Functions
 *
 * Provides UI helper functions for performance reviews, connecting to
 * GraphQL queries and providing consistent formatting and metadata.
 */

import { reviewTypes } from '$lib/schemas/reviews';
import type { ReviewStatus, ReviewType } from '$lib/schemas/reviews';
import {
	AlertTriangle,
	Award,
	Calendar,
	CheckCircle,
	Clock,
	FileText,
	Play,
	Target,
	TrendingUp,
	User,
	UserCheck,
	UserX
} from '@lucide/svelte';

/**
 * Review types for filtering UI
 */
export const reviewTypesForFilter = reviewTypes.map((rt) => ({
	value: rt.value,
	label: rt.label,
	icon: getReviewTypeIcon(rt.value)
}));

/**
 * Review statuses for filtering UI
 */
export const reviewStatuses = [
	{ value: 'DRAFT', label: 'Draft', icon: FileText },
	{ value: 'IN_PROGRESS', label: 'In Progress', icon: Play },
	{ value: 'COMPLETED', label: 'Completed', icon: CheckCircle }
];

/**
 * Get review type information including icon, label, and description
 */
export function getReviewTypeInfo(reviewType: ReviewType): {
	icon: any;
	label: string;
	description: string;
} {
	// Use the existing reviewTypes array from schemas/reviews.ts
	const typeInfo = reviewTypes.find((rt) => rt.value === reviewType);
	if (typeInfo) {
		return {
			icon: getReviewTypeIcon(reviewType),
			label: typeInfo.label,
			description: typeInfo.description
		};
	}
	return { icon: FileText, label: 'Unknown', description: 'Unknown review type' };
}

/**
 * Get review status information including icon and label
 */
export function getReviewStatusInfo(status: ReviewStatus): {
	icon: any;
	label: string;
} {
	const statusMap: Record<ReviewStatus, { icon: any; label: string }> = {
		DRAFT: { icon: FileText, label: 'Draft' },
		IN_PROGRESS: { icon: Play, label: 'In Progress' },
		COMPLETED: { icon: CheckCircle, label: 'Completed' }
	};
	return statusMap[status] || { icon: Clock, label: 'Unknown' };
}

/**
 * Format review period dates for display
 */
export function formatReviewPeriod(startDate?: string, endDate?: string): string {
	if (!startDate && !endDate) return 'No period specified';
	if (!startDate) return `Until ${formatDate(endDate!)}`;
	if (!endDate) return `From ${formatDate(startDate)}`;

	const start = new Date(startDate);
	const end = new Date(endDate);

	// Same year
	if (start.getFullYear() === end.getFullYear()) {
		return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
	}

	// Different years
	return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/**
 * Get the appropriate icon for a review type
 */
function getReviewTypeIcon(reviewType: ReviewType): any {
	const iconMap: Record<ReviewType, any> = {
		ANNUAL_REVIEW: Calendar,
		MID_YEAR_REVIEW: TrendingUp,
		QUARTERLY_REVIEW: Target,
		PROBATIONARY_REVIEW: UserCheck,
		PERFORMANCE_IMPROVEMENT_PLAN: AlertTriangle,
		NINETY_DAY_REVIEW: Clock,
		PROJECT_BASED_REVIEW: Target,
		PROMOTION_REVIEW: Award,
		EXIT_REVIEW: UserX,
		SELF_REVIEW: User
	};
	return iconMap[reviewType] || FileText;
}

/**
 * Format a single date for display
 */
function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}
