// Performance Reviews Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for performance review management

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import {
	GET_PERFORMANCE_REVIEWS,
	GET_PERFORMANCE_REVIEW_STATS,
	type PerformanceReview,
	toPostGraphileStatus,
	fromPostGraphileStatus
} from '$lib/graphql/queries/performance-reviews';

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
	// Build condition object for PostGraphile query
	const condition: any = {};
	// Filter by reviewer ID (show only reviews for this manager's team)
	// Admins and super_admins can see all reviews
	if (!isAdmin) {
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
			orderBy: ['ID_DESC'], // Most recent first
			condition: condition
		};

		const reviewsResponse = await client.query<{
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
		}>(GET_PERFORMANCE_REVIEWS, reviewsVariables);

		const reviewsData = reviewsResponse.data;

		// Query 2: Get performance review statistics
		const statsVariables = {
			reviewerId: locals.roles?.includes('admin') ? undefined : locals.user.id
		};

		const statsResponse = await client.query<{
			notStarted: { totalCount: number };
			inProgress: { totalCount: number };
			completed: { totalCount: number };
			allReviews: {
				totalCount: number;
				nodes: Array<{ overallRating: number; status: string }>;
			};
		}>(GET_PERFORMANCE_REVIEW_STATS, statsVariables);

		const statsData = statsResponse.data;

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
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						query: `
							query GetEmployeesForSelector($first: Int) {
								allUsers(first: $first) {
									nodes {
										id
										email
										displayName
										role
										departmentId
									}
									totalCount
								}
							}
						`,
						variables: {
							first: 200
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

				employees = employeesData.data?.allUsers?.nodes || [];
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

		// Calculate overdue reviews (reviews not completed with past period)
		const overdueReviews = performanceReviews.filter((review) => {
			if (review.status === 'completed') return false;
			// Simple logic: Q1-Q4 2024 or earlier are overdue
			const periodYear = parseInt(review.reviewPeriod.match(/\d{4}/)?.[0] || '0');
			const currentYear = new Date().getFullYear();
			return periodYear < currentYear;
		}).length;

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
