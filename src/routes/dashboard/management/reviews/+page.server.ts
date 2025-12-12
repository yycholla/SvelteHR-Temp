/**
 * Performance Reviews Management Page - Server Load
 * Feature: 023-reviews-creation-it
 * Task: T038
 *
 * Server-side data loading for management view of performance reviews
 * Refactored: Phase 2 - Using Phase 1 Foundation utilities
 */

import type { PageServerLoad } from './$types';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { StatisticsCalculator } from '$lib/server/analytics';
import { logger } from '$lib/utils/logger';

// Performance Review types for Rust GraphQL server
interface PerformanceReview {
	id: string;
	employeeId: string;
	reviewerId: string;
	cycleId: string | null;
	templateId: string | null;
	status: string;
	overallRating: number | null;
	submittedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, [
		'performance:read',
		'performance:read:self',
		'performance:read:team',
		'performance:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		const { url, cookies } = event;
		const params = new QueryParamExtractor(url);

		const searchTerm = params.getString('search');
		const statusFilter = params.getString('status', 'all');
		const periodFilter = params.getString('period');
		const departmentFilter = params.getString('department');
		const { page, limit, offset } = params.getPagination(20);

		const hasManagerAccess = loader.hasPermission('performance:write');
		const isAdmin = loader.getUserRole() === 'admin' || loader.getUserRole() === 'super_admin';

		logger.info('🔍 Management Reviews - User:', {
			userId: loader.getUserId(),
			role: loader.getUserRole(),
			hasManagerAccess,
			isAdmin
		});
		// Query 1: Get performance reviews with pagination and filtering
		// Using Rust GraphQL server schema with normalized relationships
		const reviewsQuery = `
			query GetPerformanceReviews($limit: Int!, $offset: Int!) {
				performanceReviews(limit: $limit, offset: $offset) {
					id
					employeeId
					reviewerId
					cycleId
					templateId
					status
					overallRating
					submittedAt
					createdAt
					updatedAt
					employee {
						id
						email
						displayName
						departmentId
						department {
							id
							name
						}
					}
					reviewer {
						id
						email
						displayName
					}
					cycle {
						id
						name
						reviewType
						startDate
						endDate
					}
					goals {
						id
						title
						description
						targetDate
					}
				}
			}
		`;

		const reviewsVariables = {
			limit,
			offset
		};

		const reviewsData = await client.query<{
			performanceReviews: PerformanceReview[];
		}>(reviewsQuery, reviewsVariables);

		// Debug logging
		logger.info('📊 [Management Reviews] GraphQL response:', {
			hasData: !!reviewsData,
			reviewsCount: reviewsData?.performanceReviews?.length || 0,
			firstReview: reviewsData?.performanceReviews?.[0] || null
		});

		if (!reviewsData) {
			throw new Error('Failed to fetch performance reviews data');
		}

		// Query 3: Get all employees for employee selector (if user can create reviews)
		// Using the same working pattern as /dashboard/employees
		let employees = [];
		if (hasManagerAccess) {
			try {
				const { getGraphQLEndpoint } = await import('$lib/server/api-url');
				const graphqlEndpoint = getGraphQLEndpoint();

				logger.info('📊 Loading employees for selector...');

				// Forward session cookies for authentication
				const cookieHeader = event.request.headers.get('cookie') || '';

				const employeesResponse = await fetch(graphqlEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Cookie: cookieHeader
					},
					body: JSON.stringify({
						query: `
							query GetEmployeesForSelector($limit: Int!) {
								users(limit: $limit) {
									id
									email
									displayName
									roles {
										id
										name
									}
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
				logger.info('📊 Employees response:', {
					hasData: !!employeesData.data,
					hasErrors: !!employeesData.errors,
					errorCount: employeesData.errors?.length || 0,
					usersCount: employeesData.data?.users?.length || 0
				});

				// Check for GraphQL errors
				if (employeesData.errors && employeesData.errors.length > 0) {
					logger.error('❌ GraphQL Errors in GetEmployeesForSelector:');
					employeesData.errors.forEach((err: any, idx: number) => {
						logger.error(`  Error ${idx + 1}:`, undefined, {
							message: err.message,
							path: err.path,
							extensions: err.extensions
						});
					});
				}

				employees = employeesData.data?.users || [];
				logger.info('✅ Employees loaded:', employees.length);
			} catch (empError) {
				logger.error(
					'❌ Error loading employees (caught exception):',
					empError instanceof Error ? empError : new Error(String(empError)),
					{
						message: empError instanceof Error ? empError.message : String(empError),
						stack: empError instanceof Error ? empError.stack : undefined
					}
				);
				employees = [];
			}
		} else {
			logger.info('⚠️ User does not have manager access, skipping employee loading');
		}

		// Process performance reviews data (Rust GraphQL server returns status in lowercase)
		const performanceReviews = reviewsData.performanceReviews.map((review: any) => {
			// Goals are not available yet due to backend schema mismatch
			// (review_goals table doesn't have performance_review_id column)
			const goalsText = '';
			const goalIds: string[] = [];

			return {
				id: review.id.toString(),
				nodeId: `node${review.id}`,
				employeeId: review.employeeId,
				reviewerId: review.reviewerId,
				cycleId: review.cycleId,
				templateId: review.templateId,
				reviewPeriod: review.cycleId ? `Cycle ${review.cycleId.slice(0, 8)}` : 'No cycle', // Fallback for now
				status: review.status.toLowerCase(), // Keep lowercase for component compatibility
				reviewType: review.cycle?.reviewType?.toUpperCase() || null,
				reviewPeriodStart: review.cycle?.startDate || null,
				reviewPeriodEnd: review.cycle?.endDate || null,
				overallRating: review.overallRating || 0,
				goals: goalsText,
				goalIds, // For edit dialog
				newGoals: [], // For edit dialog - new goals added during review creation
				notes: '', // Notes field not available in schema yet
				achievements: '', // Not available in normalized structure
				areasForImprovement: '', // Not available in normalized structure
				managerFeedback: review.managerFeedback || '',
				submittedAt: review.submittedAt,
				createdAt: review.createdAt,
				updatedAt: review.updatedAt,
				employee: review.employee || {
					id: review.employeeId,
					email: 'unknown@company.com',
					displayName: 'Unknown Employee',
					departmentId: null,
					department: null
				},
				reviewer: review.reviewer || null,
				goalsArray: [] // Goals not available yet - backend schema issue
			};
		});

		// Client-side search filtering (PostGraphile doesn't support text search natively)
		let filteredReviews = performanceReviews;
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filteredReviews = performanceReviews.filter(
				(review: (typeof performanceReviews)[number]) =>
					review.employee?.displayName?.toLowerCase().includes(searchLower) ||
					review.reviewPeriod.toLowerCase().includes(searchLower) ||
					review.goals?.toLowerCase().includes(searchLower)
			);
		}

		// Calculate statistics from the reviews data
		const reviewStats = StatisticsCalculator.forPerformanceReviews(performanceReviews);
		const totalCount = reviewStats.total;

		// Calculate average rating across all completed reviews
		const completedReviews = performanceReviews.filter(
			(review: (typeof performanceReviews)[number]) => review.status === 'completed'
		);
		const averageRating =
			completedReviews.length > 0
				? completedReviews.reduce(
						(sum: number, review: (typeof performanceReviews)[number]) =>
							sum + (review.overallRating || 0),
						0
					) / completedReviews.length
				: 0;

		// Calculate completion rate
		const completionRate =
			totalCount > 0 ? Math.round((reviewStats.completed / totalCount) * 100) : 0;

		// Pagination info
		const totalPages = Math.ceil(totalCount / limit);

		return {
			performanceReviews: filteredReviews,
			totalReviews: totalCount,
			employees,
			reviewAnalytics: {
				totalReviews: totalCount,
				completedReviews: reviewStats.completed,
				overdueReviews: reviewStats.overdue,
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
				total: totalCount,
				totalPages,
				hasNextPage: page * limit < totalCount,
				hasPreviousPage: page > 1
			},
			canCreateReviews: hasManagerAccess,
			canEditReviews: hasManagerAccess,
			canViewAllReviews: isAdmin
		};
	});
};
