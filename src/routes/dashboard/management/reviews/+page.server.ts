// Performance Reviews Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for performance review management

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
// Performance Review types for Rust GraphQL server
interface PerformanceReview {
	id: string;
	employeeId: string;
	reviewerId: string;
	reviewPeriod: string;
	status: string;
	overallRating: number;
	goals: string;
	achievements: string;
	areasForImprovement: string;
	managerFeedback: string;
	createdAt: string;
	updatedAt: string;
}

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies, fetch: fetchFn } = event;

	// Authorization is handled by parent layout (+layout.server.ts)
	const parentData = await event.parent();
	const { hasManagerAccess, isAdmin } = parentData;

	console.log('🔍 Load function - User:', {
		userId: locals.user?.id,
		role: locals.user?.role,
		hasManagerAccess,
		isAdmin
	});

	// Create server-side GraphQL client with Docker-aware endpoint
	const client = GraphQLClient.fromCookies(cookies);

	// Get JWT token for return data
	const jwtToken = cookies.get('hr_token') || cookies.get('auth-token') || '';

	// Extract search parameters for filtering and pagination
	const searchTerm = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || 'all';
	const periodFilter = url.searchParams.get('period') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;
	try {
		// Query 1: Get performance reviews with pagination and filtering
		// Using Rust GraphQL server schema
		const reviewsQuery = `
			query GetPerformanceReviews($limit: Int!, $offset: Int!) {
				performanceReviews(limit: $limit, offset: $offset) {
					id
					employeeId
					reviewerId
					reviewPeriod
					status
					overallRating
					goals
					achievements
					areasForImprovement
					managerFeedback
					createdAt
					updatedAt
				}
				performanceReviewsCount
			}
		`;

		const reviewsVariables = {
			limit: limit,
			offset: offset
		};

		const reviewsResponse = await client.query<{
			performanceReviews: PerformanceReview[];
			performanceReviewsCount: number;
		}>(reviewsQuery, reviewsVariables);

		const reviewsData = reviewsResponse.data;
		if (!reviewsData) {
			throw new Error('Failed to fetch performance reviews data');
		}

		// Query 2: Get performance review statistics using Rust GraphQL schema
		// Note: overduePerformanceReviews query is failing due to missing due_date column
		// We'll calculate overdue reviews client-side instead
		const statsQuery = `
			query GetPerformanceReviewStats {
				performanceReviewsCount
			}
		`;

		const statsResponse = await client.query<{
			performanceReviewsCount: number;
		}>(statsQuery, {});

		const statsData = statsResponse.data;
		if (!statsData) {
			throw new Error('Failed to fetch performance review statistics');
		}

		// Query 3: Get all employees for employee selector (if user can create reviews)
		// Using the same working pattern as /dashboard/employees
		let employees = [];
		if (hasManagerAccess) {
			try {
				const { getGraphQLEndpoint } = await import('$lib/server/api-url');
				const graphqlEndpoint = getGraphQLEndpoint();

				console.log('📊 Loading employees for selector...');

				const employeesResponse = await fetch(graphqlEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${jwtToken}`
					},
					body: JSON.stringify({
						query: `
							query GetEmployeesForSelector($limit: Int!) {
								users(limit: $limit) {
									id
									email
									displayName
									role
									departmentId
								}
							}
						`,
						variables: {
							limit: 200
						}
					})
				});

				const employeesData = await employeesResponse.json();

				// Log response for debugging
				console.log('📊 Employees response:', {
					hasData: !!employeesData.data,
					hasErrors: !!employeesData.errors,
					errorCount: employeesData.errors?.length || 0,
					nodeCount: employeesData.data?.allUsers?.nodes?.length || 0
				});

				// Check for GraphQL errors
				if (employeesData.errors && employeesData.errors.length > 0) {
					console.error('❌ GraphQL Errors in GetEmployeesForSelector:');
					employeesData.errors.forEach((err: any, idx: number) => {
						console.error(`  Error ${idx + 1}:`, {
							message: err.message,
							path: err.path,
							extensions: err.extensions
						});
					});
				}

				employees = employeesData.data?.users || [];
				console.log('✅ Employees loaded:', employees.length);
			} catch (empError) {
				console.error('❌ Error loading employees (caught exception):', {
					error: empError,
					message: empError instanceof Error ? empError.message : String(empError),
					stack: empError instanceof Error ? empError.stack : undefined
				});
				employees = [];
			}
		} else {
			console.log('⚠️ User does not have manager access, skipping employee loading');
		}

		// Process performance reviews data (Rust GraphQL server returns status in lowercase)
		const performanceReviews = reviewsData.performanceReviews.map((review) => ({
			id: review.id.toString(),
			nodeId: `node${review.id}`,
			employeeId: review.employeeId,
			reviewerId: review.reviewerId,
			reviewPeriod: review.reviewPeriod,
			status: review.status.toLowerCase(), // Ensure lowercase for UI
			overallRating: review.overallRating,
			goals: review.goals,
			achievements: review.achievements,
			areasForImprovement: review.areasForImprovement,
			managerFeedback: review.managerFeedback,
			createdAt: review.createdAt,
			updatedAt: review.updatedAt,
			employee: {
				id: review.employeeId,
				email: `employee${review.employeeId}@company.com`, // Placeholder
				displayName: `Employee ${review.employeeId}`, // Placeholder
				departmentId: null, // TODO: Get from separate query
				department: null // TODO: Get from separate query
			},
			reviewer: review.reviewerId
				? {
						id: review.reviewerId,
						email: `reviewer${review.reviewerId}@company.com`, // Placeholder
						displayName: `Reviewer ${review.reviewerId}` // Placeholder
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

		// Calculate statistics from the reviews data
		const totalCount = reviewsData.performanceReviewsCount;
		const completedCount = performanceReviews.filter((r) => r.status === 'completed').length;
		const inProgressCount = performanceReviews.filter((r) => r.status === 'in_progress').length;
		const notStartedCount = performanceReviews.filter((r) => r.status === 'not_started').length;

		// Calculate average rating across all completed reviews
		const completedReviews = performanceReviews.filter((review) => review.status === 'completed');
		const averageRating =
			completedReviews.length > 0
				? completedReviews.reduce((sum, review) => sum + (review.overallRating || 0), 0) /
					completedReviews.length
				: 0;

		// Calculate completion rate
		const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

		// Calculate overdue reviews client-side (reviews not completed with past period)
		const overdueReviews = performanceReviews.filter((review) => {
			if (review.status === 'completed') return false;
			// Simple logic: Q1-Q4 2024 or earlier are overdue
			const periodYear = parseInt(review.reviewPeriod.match(/\d{4}/)?.[0] || '0');
			const currentYear = new Date().getFullYear();
			return periodYear < currentYear;
		}).length;

		// Pagination info
		const totalPages = Math.ceil(reviewsData.performanceReviewsCount / limit);

		return {
			user: {
				id: locals.user?.id || '',
				email: locals.user?.email || '',
				displayName: locals.user?.display_name || 'User',
				role: locals.user?.role || 'employee'
			},
			userSession: {
				userId: locals.user?.id || '',
				userEmail: locals.user?.email || '',
				role: locals.user?.role || 'employee',
				accessToken: jwtToken
			},
			performanceReviews: filteredReviews,
			totalReviews: reviewsData.performanceReviewsCount,
			employees,
			reviewAnalytics: {
				totalReviews: totalCount,
				completedReviews: completedCount,
				overdueReviews: overdueReviews,
				completionRate,
				averageRatings: {
					overall: Math.round(averageRating * 10) / 10, // Round to 1 decimal
					goalsAchievement: Math.round(averageRating * 10) / 10,
					collaboration: Math.round(averageRating * 10) / 10,
					communication: Math.round(averageRating * 10) / 10
				}
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
				total: reviewsData.performanceReviewsCount,
				totalPages,
				hasNextPage: page * limit < reviewsData.performanceReviewsCount,
				hasPreviousPage: page > 1
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
				id: locals.user?.id || '',
				email: locals.user?.email || '',
				displayName: locals.user?.display_name || 'User',
				role: locals.user?.role || 'employee'
			},
			userSession: {
				userId: locals.user?.id || '',
				userEmail: locals.user?.email || '',
				role: locals.user?.role || 'employee',
				accessToken: jwtToken
			},
			performanceReviews: [],
			totalReviews: 0,
			employees: [],
			reviewAnalytics: {
				totalReviews: 0,
				completedReviews: 0,
				overdueReviews: 0,
				completionRate: 0,
				averageRatings: {
					overall: 0,
					goalsAchievement: 0,
					collaboration: 0,
					communication: 0
				}
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
