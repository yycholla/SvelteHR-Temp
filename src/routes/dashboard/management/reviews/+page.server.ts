/**
 * Performance Reviews Management Page - Server Load
 * Feature: 023-reviews-creation-it
 * Task: T038
 *
 * Server-side data loading for management view of performance reviews
 * Refactored: Phase 3 - Standardized using RBACDataLoader and UnifiedGraphQLClient
 */

import type { PageServerLoad } from './$types';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { AccessTier } from '$lib/server/rbac-utils';
import { QueryParamExtractor, ClientSideFilter } from '$lib/server/route-helpers';
import { StatisticsCalculator, Aggregators } from '$lib/server/analytics';
import { logger } from '$lib/utils/logger';
import { gql } from '@urql/svelte';

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
	employee?: {
		id: string;
		email: string;
		displayName: string;
		departmentId?: string;
		department?: {
			id: string;
			name: string;
		};
	};
	reviewer?: {
		id: string;
		email: string;
		displayName: string;
	};
	cycle?: {
		id: string;
		name: string;
		reviewType: string;
		startDate: string;
		endDate: string;
	};
	goals?: {
		id: string;
		title: string;
		description: string;
		targetDate: string;
	}[];
	managerFeedback?: string;
}

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, AccessTier.TEAM);

	return loader.loadWithClient(async (client) => {
		const { url } = event;
		const params = new QueryParamExtractor(url);

		const searchTerm = params.getString('search');
		const statusFilter = params.getString('status', 'all');
		const periodFilter = params.getString('period');
		const departmentFilter = params.getString('department');
		const { page, limit, offset } = params.getPagination(20);

		const hasManagerAccess = loader.hasPermission('performance:write');
		const isAdmin = loader.hasRole('admin') || loader.hasRole('super_admin');

		logger.info('🔍 Management Reviews - User:', {
			userId: loader.getUserId(),
			role: loader.getUserRole(),
			hasManagerAccess,
			isAdmin
		});

		// Query 1: Get performance reviews with pagination and filtering
		// Using Rust GraphQL server schema with normalized relationships
		const GET_REVIEWS = gql`
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

		const reviewsData = await client.query<{
			performanceReviews: PerformanceReview[];
		}>(GET_REVIEWS, {
			limit: 1000, // Fetch more for client-side filtering/stats
			offset: 0
		});

		const rawReviews = reviewsData?.performanceReviews || [];

		// Query 3: Get all employees for employee selector (if user can create reviews)
		let employees = [];
		if (hasManagerAccess) {
			try {
				const GET_EMPLOYEES = gql`
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
				`;

				const employeesData = await client.query(GET_EMPLOYEES, {
					limit: 200
				});

				employees = employeesData?.users || [];
				logger.info('✅ Employees loaded:', employees.length);
			} catch (empError) {
				logger.error('❌ Error loading employees:', empError as Error);
				employees = [];
			}
		}

		// Process performance reviews data
		const performanceReviews = rawReviews.map((review) => {
			const goalsText = '';
			const goalIds: string[] = [];

			return {
				id: review.id.toString(),
				nodeId: `node${review.id}`,
				employeeId: review.employeeId,
				reviewerId: review.reviewerId,
				cycleId: review.cycleId,
				templateId: review.templateId,
				reviewPeriod: review.cycleId ? `Cycle ${review.cycleId.slice(0, 8)}` : 'No cycle',
				status: review.status.toLowerCase(),
				reviewType: review.cycle?.reviewType?.toUpperCase() || null,
				reviewPeriodStart: review.cycle?.startDate || null,
				reviewPeriodEnd: review.cycle?.endDate || null,
				overallRating: review.overallRating || 0,
				goals: goalsText,
				goalIds,
				newGoals: [],
				notes: '',
				achievements: '',
				areasForImprovement: '',
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
				goalsArray: []
			};
		});

		// Client-side filtering using ClientSideFilter
		const filter = new ClientSideFilter(performanceReviews);

		if (searchTerm) {
			filter.search(searchTerm, ['reviewPeriod', 'goals']);
			// Custom search for nested employee name
			filter.filter((review: any) =>
				review.employee?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		if (statusFilter && statusFilter !== 'all') {
			filter.where('status', statusFilter.toLowerCase());
		}

		// Apply filtering
		const filteredReviews = filter.get();
		const totalCount = filteredReviews.length;

		// Calculate statistics
		const reviewStats = StatisticsCalculator.forPerformanceReviews(filteredReviews);

		// Calculate average rating across all completed reviews (filtered set)
		const completedReviews = filteredReviews.filter((r) => r.status === 'completed');
		const averageRating =
			completedReviews.length > 0 ? Aggregators.average(completedReviews, 'overallRating') : 0;

		// Calculate completion rate
		const completionRate =
			totalCount > 0 ? Math.round((reviewStats.completed / totalCount) * 100) : 0;

		// Apply pagination
		const paginatedReviews = filter.paginate(page, limit).get();
		const totalPages = Math.ceil(totalCount / limit);

		return {
			performanceReviews: paginatedReviews,
			totalReviews: totalCount,
			employees,
			reviewAnalytics: {
				totalReviews: totalCount,
				completedReviews: reviewStats.completed,
				overdueReviews: reviewStats.overdue,
				completionRate,
				averageRatings: {
					overall: Math.round(averageRating * 10) / 10,
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
