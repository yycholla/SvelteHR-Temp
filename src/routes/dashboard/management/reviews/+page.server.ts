// Performance Reviews Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for performance review management

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createUrqlClient, executeQuery } from '$lib/graphql/client';
import {
	GET_PERFORMANCE_REVIEWS,
	GET_PERFORMANCE_REVIEW_STATS,
	type PerformanceReview,
	toPostGraphileStatus,
	fromPostGraphileStatus
} from '$lib/graphql/queries/performance-reviews';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies, fetch: fetchFn } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Check if user has manager or admin role for performance reviews
	const hasManagerAccess = locals.roles?.includes('admin') || locals.roles?.includes('manager');
	if (!hasManagerAccess) {
		throw error(403, 'Manager or Admin role required');
	}

	// Get JWT token for PostGraphile authentication
	const jwtToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!jwtToken) {
		throw error(401, 'Authentication token required');
	}

	// Create GraphQL client with server-side fetch and auth token
	const graphqlClient = createUrqlClient(fetchFn, jwtToken);

	// Extract search parameters for filtering and pagination
	const searchTerm = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || 'all';
	const periodFilter = url.searchParams.get('period') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;

	// Build condition object for PostGraphile query
	const condition: any = {};

	// Filter by reviewer ID (show only reviews for this manager's team)
	// Admins can see all reviews
	if (!locals.roles?.includes('admin')) {
		condition.reviewerId = locals.user.id;
	}

	// Filter by status (convert to uppercase for PostGraphile)
	if (statusFilter && statusFilter !== 'all') {
		condition.status = toPostGraphileStatus(statusFilter);
	}

	// Filter by review period
	if (periodFilter) {
		condition.reviewPeriod = periodFilter;
	}

	try {
		// Query 1: Get performance reviews with pagination and filtering
		const reviewsVariables = {
			first: limit,
			offset: offset,
			orderBy: ['CREATED_AT_DESC'], // Most recent first
			condition: condition
		};

		const reviewsData = await executeQuery<{
			allPerformanceReviews: {
				totalCount: number;
				nodes: PerformanceReview[];
				pageInfo: {
					hasNextPage: boolean;
					hasPreviousPage: boolean;
					startCursor: string | null;
					endCursor: string | null;
				};
			};
		}>(graphqlClient, GET_PERFORMANCE_REVIEWS, reviewsVariables);

		// Query 2: Get performance review statistics
		const statsVariables = {
			reviewerId: locals.roles?.includes('admin') ? undefined : locals.user.id
		};

		const statsData = await executeQuery<{
			notStarted: { totalCount: number };
			inProgress: { totalCount: number };
			completed: { totalCount: number };
			allReviews: {
				totalCount: number;
				nodes: Array<{ overallRating: number; status: string }>;
			};
		}>(graphqlClient, GET_PERFORMANCE_REVIEW_STATS, statsVariables);

		// Process performance reviews data (convert status from uppercase to lowercase for UI)
		const performanceReviews = reviewsData.allPerformanceReviews.nodes.map((review) => ({
			id: review.id,
			nodeId: review.nodeId,
			employeeId: review.employeeId,
			reviewerId: review.reviewerId,
			reviewPeriod: review.reviewPeriod,
			status: fromPostGraphileStatus(review.status), // Convert to lowercase for UI
			overallRating: review.overallRating,
			goals: review.goals,
			achievements: review.achievements,
			areasForImprovement: review.areasForImprovement,
			managerFeedback: review.managerFeedback,
			createdAt: review.createdAt,
			updatedAt: review.updatedAt,
			employee: review.userByEmployeeId
				? {
						id: review.userByEmployeeId.id,
						email: review.userByEmployeeId.email,
						displayName: review.userByEmployeeId.displayName,
						departmentId: review.userByEmployeeId.departmentId,
						department: review.userByEmployeeId.departmentByDepartmentId
							? {
									id: review.userByEmployeeId.departmentByDepartmentId.id,
									name: review.userByEmployeeId.departmentByDepartmentId.name
								}
							: null
					}
				: null,
			reviewer: review.userByReviewerId
				? {
						id: review.userByReviewerId.id,
						email: review.userByReviewerId.email,
						displayName: review.userByReviewerId.displayName
					}
				: null
		}));

		// Client-side search filtering (PostGraphile doesn't support text search natively)
		let filteredReviews = performanceReviews;
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filteredReviews = performanceReviews.filter(
				(review) =>
					review.employee?.displayName?.toLowerCase().includes(searchLower) ||
					review.reviewPeriod.toLowerCase().includes(searchLower) ||
					review.goals?.toLowerCase().includes(searchLower)
			);
		}

		// Calculate statistics
		const notStartedCount = statsData.notStarted.totalCount;
		const inProgressCount = statsData.inProgress.totalCount;
		const completedCount = statsData.completed.totalCount;
		const totalCount = statsData.allReviews.totalCount;

		// Calculate average rating across all completed reviews
		const completedReviews = statsData.allReviews.nodes.filter(
			(node) => fromPostGraphileStatus(node.status) === 'completed'
		);
		const averageRating =
			completedReviews.length > 0
				? completedReviews.reduce((sum, node) => sum + (node.overallRating || 0), 0) /
					completedReviews.length
				: 0;

		// Calculate completion rate
		const completionRate =
			totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

		// Pagination info
		const totalPages = Math.ceil(reviewsData.allPerformanceReviews.totalCount / limit);

		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: locals.user.role || 'employee'
			},
			userSession: {
				userId: locals.user.id,
				userEmail: locals.user.email || '',
				role: locals.user.role || 'employee',
				accessToken: jwtToken
			},
			performanceReviews: filteredReviews,
			totalReviews: reviewsData.allPerformanceReviews.totalCount,
			reviewAnalytics: {
				notStartedCount,
				inProgressCount,
				completedCount,
				totalCount,
				averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
				completionRate
			},
			filters: {
				searchTerm,
				statusFilter,
				periodFilter,
				departmentFilter
			},
			pagination: {
				page,
				limit,
				total: reviewsData.allPerformanceReviews.totalCount,
				totalPages,
				hasNextPage: reviewsData.allPerformanceReviews.pageInfo.hasNextPage,
				hasPreviousPage: reviewsData.allPerformanceReviews.pageInfo.hasPreviousPage
			},
			permissions: locals.permissions || [],
			canCreateReviews: hasManagerAccess,
			canEditReviews: hasManagerAccess,
			canViewAllReviews: locals.roles?.includes('admin') || false,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading performance reviews:', err);

		// Return empty data structure with error information
		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: locals.user.role || 'employee'
			},
			userSession: {
				userId: locals.user.id,
				userEmail: locals.user.email || '',
				role: locals.user.role || 'employee',
				accessToken: jwtToken
			},
			performanceReviews: [],
			totalReviews: 0,
			reviewAnalytics: {
				notStartedCount: 0,
				inProgressCount: 0,
				completedCount: 0,
				totalCount: 0,
				averageRating: 0,
				completionRate: 0
			},
			filters: {
				searchTerm,
				statusFilter,
				periodFilter,
				departmentFilter
			},
			pagination: {
				page,
				limit,
				total: 0,
				totalPages: 0,
				hasNextPage: false,
				hasPreviousPage: false
			},
			permissions: locals.permissions || [],
			canCreateReviews: hasManagerAccess,
			canEditReviews: hasManagerAccess,
			canViewAllReviews: locals.roles?.includes('admin') || false,
			loadedAt: new Date().toISOString(),
			error: `Failed to load performance reviews: ${err instanceof Error ? err.message : 'Unknown error'}`
		};
	}
};
