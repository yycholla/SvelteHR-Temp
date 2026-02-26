/**
 * Performance Reviews Management Page - Server Load
 * Feature: 023-reviews-creation-it
 * Task: T035
 *
 * Server-side data loading for reviews management page
 * Implements permission-based access control
 * Refactored: Phase 2 - Using Phase 1 Foundation utilities
 */

import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { AccessTier } from '$lib/server/rbac-utils';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, AccessTier.SELF);

	return loader.loadWithClient(async () => {
		const { url, cookies } = event;
		const params = new QueryParamExtractor(url);

		const userId = loader.getUserId();
		const userRole = loader.getUserRole();

		// Check if user can create reviews (write permission)
		const canCreate = loader.hasPermission('performance:write');

		// Extract search parameters using QueryParamExtractor
		const { page, limit } = params.getPagination(20);
		const searchQuery = params.getString('search');
		const statusFilter = params.getString('status');
		const typeFilter = params.getString('type');
		const employeeId = params.getString('employee');

		// Create server-side GraphQL client with Docker-aware endpoint
		const client = GraphQLClient.fromCookies(cookies);

		// Build filter condition based on user role
		const condition: any = {};

		// RBAC: Filter reviews based on role
		if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr_manager') {
			// Admins and HR managers can see all reviews
			// No additional filtering needed
		} else if (userRole === 'manager') {
			// Managers can see reviews they created (as reviewer)
			condition.reviewerId = userId;
		} else {
			// Employees can see their own reviews
			condition.employeeId = userId;
		}

		// Apply status filter
		if (
			statusFilter &&
			['DRAFT', 'IN_PROGRESS', 'COMPLETED'].includes(statusFilter.toUpperCase())
		) {
			condition.status = statusFilter.toUpperCase();
		}

		// Apply type filter
		// NOTE: Type filtering is done client-side after fetching, using cycle.reviewType
		// (condition object is not used by Rust GraphQL backend)

		// Query 1: Get performance reviews
		// NOTE: Rust GraphQL backend does NOT support filter parameter
		// Fetch all reviews and filter client-side
		const reviewsQuery = `
			query GetPerformanceReviews($limit: Int!, $offset: Int!) {
				performanceReviews(limit: $limit, offset: $offset) {
					id
					status
					overallRating
					createdAt
					updatedAt
					employee {
						id
						displayName
						email
					}
					reviewer {
						id
						displayName
						email
					}
					cycle {
						id
						name
						reviewType
						startDate
						endDate
					}
				}
			}
		`;

		const reviewsResponse = await client.query<{
			performanceReviews: Array<{
				id: string;
				status: string;
				overallRating: number | null;
				createdAt: string;
				updatedAt: string;
				employee: {
					id: string;
					displayName: string;
					email: string;
				};
				reviewer: {
					id: string;
					displayName: string;
					email: string;
				};
				cycle: {
					id: string;
					name: string;
					reviewType: string;
					startDate: string;
					endDate: string;
				} | null;
			}>;
		}>(reviewsQuery, { limit: 1000, offset: 0 });

		// Log any GraphQL errors
		if (reviewsResponse.errors && reviewsResponse.errors.length > 0) {
			logger.error('❌ GraphQL Errors in GetPerformanceReviews:');
			reviewsResponse.errors.forEach((err, idx) => {
				logger.error(`  Error ${idx + 1}:`, undefined, {
					message: err.message,
					path: err.path,
					extensions: err.extensions
				});
			});
		}

		const reviewsData = reviewsResponse.data;

		// Debug logging
		logger.info('📊 Reviews query response:', {
			hasData: !!reviewsData,
			reviewsCount: reviewsData?.performanceReviews?.length || 0,
			firstReview: reviewsData?.performanceReviews?.[0] || null
		});

		// Extract reviews directly (no .nodes wrapper)
		let mappedReviews = (reviewsData?.performanceReviews || []).map((review) => ({
			...review,
			// Keep status lowercase for component compatibility
			status: review.status.toLowerCase(),
			// Transform cycle fields for component compatibility (uppercase enum values)
			reviewType: review.cycle?.reviewType?.toUpperCase() || null,
			reviewPeriodStart: review.cycle?.startDate || null,
			reviewPeriodEnd: review.cycle?.endDate || null
		}));

		// Debug logging after transformation
		logger.info('📊 After transformation:', {
			mappedReviewsCount: mappedReviews.length,
			firstMappedReview: mappedReviews[0] || null,
			statusValues: [...new Set(mappedReviews.map((r) => r.status))]
		});

		// Client-side filtering for status (Rust backend doesn't support filter parameter)
		if (
			statusFilter &&
			['DRAFT', 'IN_PROGRESS', 'COMPLETED'].includes(statusFilter.toUpperCase())
		) {
			mappedReviews = mappedReviews.filter((r) => r.status === statusFilter.toUpperCase());
			logger.info('📊 After status filter:', {
				statusFilter,
				remainingCount: mappedReviews.length
			});
		}

		// Client-side filtering for type (using cycle.reviewType)
		if (typeFilter) {
			mappedReviews = mappedReviews.filter((r) => r.cycle?.reviewType === typeFilter.toUpperCase());
		}

		// Query 2: Get review types metadata
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		const metadataResponse = await client.query<{
			reviewTypesMetadata: Array<{
				value: string;
				label: string;
				description: string;
				displayOrder: number;
			}>;
		}>(
			`
			query GetReviewTypesMetadata($limit: Int!) {
				reviewTypesMetadata(limit: $limit) {
					value
					label
					description
					displayOrder
				}
			}
		`,
			{ limit: 100 }
		);

		const metadataData = metadataResponse.data;

		// Query 3: Get all employees for employee selector (if user can create reviews)
		let employees = [];
		if (canCreate) {
			try {
				const { getGraphQLEndpoint } = await import('$lib/server/api-url');
				const graphqlEndpoint = getGraphQLEndpoint();

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
			} catch (empError) {
				logger.error(
					'❌ Error loading employees:',
					empError instanceof Error ? empError : new Error(String(empError))
				);
				employees = [];
			}
		}

		// Query 4: Get employee data if employee ID is provided (for create dialog)
		// NOTE: Using Rust GraphQL schema - singular query for ID lookup
		let selectedEmployee = null;
		if (employeeId) {
			try {
				const employeeResponse = await client.query<{
					user: {
						id: string;
						displayName: string;
						email: string;
						role: string;
						departmentId: string | null;
					} | null;
				}>(
					`
					query GetEmployee($employeeId: UUID!) {
						user(id: $employeeId) {
							id
							displayName
							email
							roles {
								id
								name
							}
							departmentId
						}
					}
				`,
					{ employeeId }
				);

				if (employeeResponse.errors && employeeResponse.errors.length > 0) {
					logger.error('❌ GraphQL Errors in GetEmployee:');
					employeeResponse.errors.forEach((err, idx) => {
						logger.error(`  Error ${idx + 1}:`, undefined, {
							message: err.message,
							path: err.path,
							extensions: err.extensions
						});
					});
				}

				selectedEmployee = employeeResponse.data?.user || null;
			} catch (empError) {
				logger.error(
					'❌ Error loading employee:',
					empError instanceof Error ? empError : new Error(String(empError))
				);
			}
		}

		// Process reviews (use mapped reviews with backward-compatible field names)
		let reviews = mappedReviews;

		// Client-side search filtering (if search query provided)
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			reviews = reviews.filter(
				(review) =>
					review.employee?.displayName?.toLowerCase().includes(query) ||
					review.employee?.email?.toLowerCase().includes(query) ||
					review.reviewer?.displayName?.toLowerCase().includes(query) ||
					review.cycle?.name?.toLowerCase().includes(query)
			);
		}

		// Calculate statistics
		const totalReviews = mappedReviews.length;
		const stats = {
			total: totalReviews,
			draft: reviews.filter((r) => r.status === 'draft').length,
			inProgress: reviews.filter((r) => r.status === 'in_progress').length,
			completed: reviews.filter((r) => r.status === 'completed').length
		};

		// Debug logging final results
		logger.info('📊 Final results:', {
			totalReviews,
			reviewsCount: reviews.length,
			stats,
			firstReview: reviews[0] || null
		});

		// Pagination info
		const totalPages = Math.ceil(totalReviews / limit);

		return {
			reviews,
			employees,
			reviewTypesMetadata: metadataData?.reviewTypesMetadata || [],
			selectedEmployee,
			stats,
			filters: {
				search: searchQuery,
				status: statusFilter,
				type: typeFilter
			},
			pagination: {
				page,
				limit,
				total: totalReviews,
				totalPages,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1
			},
			permissions: {
				canCreate,
				canViewAll: userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr_manager'
			}
		};
	});
};
