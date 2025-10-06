/**
 * Performance Reviews Management Page - Server Load
 * Feature: 023-reviews-creation-it
 * Task: T035
 *
 * Server-side data loading for reviews management page
 * Implements RBAC filtering based on user role
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { canCreateReview } from '$lib/utils/rbac';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	// Extract search parameters
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;
	const searchQuery = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status');
	const typeFilter = url.searchParams.get('type');
	const employeeId = url.searchParams.get('employee');

	try {
		// Create server-side GraphQL client with Docker-aware endpoint
		const client = GraphQLClient.fromCookies(cookies);

		// Build filter condition based on user role
		let condition: any = {};

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
		if (statusFilter && ['DRAFT', 'IN_PROGRESS', 'COMPLETED'].includes(statusFilter.toUpperCase())) {
			condition.status = statusFilter.toUpperCase();
		}

		// Apply type filter
		if (typeFilter) {
			condition.reviewType = typeFilter.toUpperCase();
		}

		// Query 1: Get performance reviews
		const reviewsResponse = await client.query<{
			allPerformanceReviews: {
				nodes: Array<{
					id: string;
					employeeId: string;
					reviewerId: string;
					reviewType: string;
					status: string;
					reviewPeriodStart: string | null;
					reviewPeriodEnd: string | null;
					notes: string | null;
					createdAt: string;
					updatedAt: string;
					userByEmployeeId: {
						id: string;
						displayName: string;
						email: string;
					};
					userByReviewerId: {
						id: string;
						displayName: string;
						email: string;
					};
				}>;
				totalCount: number;
				pageInfo: {
					hasNextPage: boolean;
					hasPreviousPage: boolean;
				};
			};
		}>(
			`
			query GetPerformanceReviews(
				$first: Int = 50
				$offset: Int = 0
				$orderBy: [PerformanceReviewsOrderBy!] = [ID_DESC]
				$condition: PerformanceReviewCondition
			) {
				allPerformanceReviews(
					first: $first
					offset: $offset
					orderBy: $orderBy
					condition: $condition
				) {
					nodes {
						id
						employeeId
						reviewerId
						reviewType
						status
						reviewPeriodStart
						reviewPeriodEnd
						notes
						createdAt
						updatedAt
						userByEmployeeId {
							id
							displayName
							email
						}
						userByReviewerId {
							id
							displayName
							email
						}
					}
					totalCount
					pageInfo {
						hasNextPage
						hasPreviousPage
						startCursor
						endCursor
					}
				}
			}
		`,
			{
				first: limit,
				offset,
				orderBy: ['ID_DESC'],
				condition
			}
		);

		// Log any GraphQL errors
		if (reviewsResponse.errors && reviewsResponse.errors.length > 0) {
			console.error('❌ GraphQL Errors in GetPerformanceReviews:');
			reviewsResponse.errors.forEach((err, idx) => {
				console.error(`  Error ${idx + 1}:`, {
					message: err.message,
					path: err.path,
					extensions: err.extensions
				});
			});
		}

		const reviewsData = reviewsResponse.data;

		// Map PostGraphile field names to expected format for backward compatibility
		const mappedReviews = reviewsData?.allPerformanceReviews?.nodes.map((review: any) => ({
			...review,
			employee: review.userByEmployeeId,
			reviewer: review.userByReviewerId
		})) || [];

		// Query 2: Get review types metadata
		const metadataResponse = await client.query<{
			reviewTypesMetadata: {
				nodes: Array<{
					value: string;
					label: string;
					description: string;
					displayOrder: number;
				}>;
			};
		}>(
			`
			query GetReviewTypesMetadata {
				reviewTypesMetadata {
					nodes {
						value
						label
						description
						displayOrder
					}
				}
			}
		`,
			{}
		);

		const metadataData = metadataResponse.data;

		// Query 3: Get all employees for employee selector (if user can create reviews)
		let employees = [];
		if (canCreate) {
			try {
				const { getGraphQLEndpoint } = await import('$lib/server/api-url');
				const graphqlEndpoint = getGraphQLEndpoint();

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
			} catch (empError) {
				console.error('❌ Error loading employees:', empError);
				employees = [];
			}
		}

		// Query 4: Get employee data if employee ID is provided (for create dialog)
		let selectedEmployee = null;
		if (employeeId) {
			try {
				const { getGraphQLEndpoint } = await import('$lib/server/api-url');
				const graphqlEndpoint = getGraphQLEndpoint();

				const employeeResponse = await fetch(graphqlEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						query: `
							query GetEmployee($employeeId: UUID!) {
								allUsers(condition: { id: $employeeId }, first: 1) {
									nodes {
										id
										displayName
										email
										role
										departmentId
									}
								}
							}
						`,
						variables: { employeeId }
					})
				});

				const employeeData = await employeeResponse.json();

				if (employeeData.errors && employeeData.errors.length > 0) {
					console.error('❌ GraphQL Errors in GetEmployee:');
					employeeData.errors.forEach((err: any, idx: number) => {
						console.error(`  Error ${idx + 1}:`, {
							message: err.message,
							path: err.path,
							extensions: err.extensions
						});
					});
				}

				if (employeeData.data?.allUsers?.nodes.length > 0) {
					selectedEmployee = employeeData.data.allUsers.nodes[0];
				}
			} catch (empError) {
				console.error('❌ Error loading employee:', empError);
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
					review.notes?.toLowerCase().includes(query)
			);
		}

		// Calculate statistics
		const totalReviews = reviewsData?.allPerformanceReviews?.totalCount || 0;
		const draftCount = reviews.filter((r) => r.status === 'DRAFT').length;
		const inProgressCount = reviews.filter((r) => r.status === 'IN_PROGRESS').length;
		const completedCount = reviews.filter((r) => r.status === 'COMPLETED').length;

		// Pagination info
		const totalPages = Math.ceil(totalReviews / limit);

		// Check if user can create reviews
		const canCreate =
			userRole === 'admin' ||
			userRole === 'super_admin' ||
			userRole === 'hr_manager' ||
			userRole === 'manager';

		return {
			user: {
				id: userId,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: userRole
			},
			reviews,
			employees,
			reviewTypesMetadata: metadataData.reviewTypesMetadata?.nodes || [],
			selectedEmployee,
			stats: {
				total: totalReviews,
				draft: draftCount,
				inProgress: inProgressCount,
				completed: completedCount
			},
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
				hasNextPage: reviewsData?.allPerformanceReviews?.pageInfo.hasNextPage || false,
				hasPreviousPage: reviewsData?.allPerformanceReviews?.pageInfo.hasPreviousPage || false
			},
			permissions: {
				canCreate,
				canViewAll: userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr_manager'
			}
		};
	} catch (err) {
		console.error('Error loading reviews:', err);

		return {
			user: {
				id: userId,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: userRole
			},
			reviews: [],
			employees: [],
			reviewTypesMetadata: [],
			selectedEmployee: null,
			stats: {
				total: 0,
				draft: 0,
				inProgress: 0,
				completed: 0
			},
			filters: {
				search: searchQuery,
				status: statusFilter,
				type: typeFilter
			},
			pagination: {
				page,
				limit,
				total: 0,
				totalPages: 0,
				hasNextPage: false,
				hasPreviousPage: false
			},
			permissions: {
				canCreate: false,
				canViewAll: false
			},
			error: `Failed to load reviews: ${err instanceof Error ? err.message : 'Unknown error'}`
		};
	}
};
