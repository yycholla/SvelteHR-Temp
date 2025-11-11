// Performance Reviews Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for performance review management

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';

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
	const { locals, url, cookies, fetch: fetchFn } = event;

	// Check authentication and permissions
	PermissionChecks.performanceRead(event);

	console.log('🔍 Load function - User:', {
		userId: locals.user?.id,
		role: locals.user?.role,
		hasManagerAccess,
		isAdmin
	});

	// Create server-side GraphQL client with Docker-aware endpoint
	const client = GraphQLClient.fromCookies(cookies);

	// Get JWT token for return data

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
						completionStatus
					}
					managerFeedback
				}
			}
		`;

		const reviewsVariables = {
			limit: limit,
			offset: offset
		};

		const reviewsResponse = await client.query<{
			performanceReviews: PerformanceReview[];
		}>(reviewsQuery, reviewsVariables);

		const reviewsData = reviewsResponse.data;
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

				console.log('📊 Loading employees for selector...');

				const employeesResponse = await fetch(graphqlEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						query: `
							query GetEmployeesForSelector($limit: Int!) {
								users(limit: $limit) {
									id
									email
									displayName
									roles
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
					usersCount: employeesData.data?.users?.length || 0
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
		const performanceReviews = reviewsData.performanceReviews.map((review: any) => {
			// Extract goals text from goals array
			const goalsText = review.goals?.map((g: any) => g.title).join('; ') || '';

			return {
				id: review.id.toString(),
				nodeId: `node${review.id}`,
				employeeId: review.employeeId,
				reviewerId: review.reviewerId,
				cycleId: review.cycleId,
				templateId: review.templateId,
				reviewPeriod: review.cycleId ? `Cycle ${review.cycleId.slice(0, 8)}` : 'No cycle', // Fallback for now
				status: review.status.toLowerCase(), // Ensure lowercase for UI
				overallRating: review.overallRating || 0,
				goals: goalsText,
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
				goalsArray: review.goals || [] // Keep full goals array for detailed view
			};
		});

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
		const totalCount = performanceReviews.length;
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

		// Calculate overdue reviews client-side
		// Reviews without submission date that are older than 30 days are considered overdue
		const overdueReviews = performanceReviews.filter((review) => {
			if (review.status === 'completed' || review.submittedAt) return false;
			const createdDate = new Date(review.createdAt);
			const now = new Date();
			const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
			return daysDiff > 30;
		}).length;

		// Pagination info
		const totalPages = Math.ceil(totalCount / limit);

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
				accessToken: '' // Session-based auth doesn't use access tokens
			},
			performanceReviews: filteredReviews,
			totalReviews: totalCount,
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
				total: totalCount,
				totalPages,
				hasNextPage: page * limit < totalCount,
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
				accessToken: '' // Session-based auth doesn't use access tokens
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
