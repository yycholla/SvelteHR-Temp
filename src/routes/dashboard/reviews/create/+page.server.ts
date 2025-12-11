/**
 * Performance Review Creation Page - Server Load & Actions
 * Feature: 023-reviews-creation-it
 *
 * Server-side data loading and mutation handling for review creation page
 */

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { url, cookies } = event;

	// Check authentication and permissions (write required to create reviews)
	requireAuth(event, {
		requiredPermissions: [
			'performance:write',
			'performance:write:self',
			'performance:write:team',
			'performance:write:all'
		]
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	// Get employee ID from URL parameter (optional)
	const employeeId = url.searchParams.get('employee');

	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Forward session cookies for authentication
		const cookieHeader = event.request.headers.get('cookie') || '';

		// Query 1: Get all employees for employee selector
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		const employeesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: cookieHeader
			},
			body: JSON.stringify({
				query: `
					query GetEmployeesForReview($limit: Int!) {
						users(limit: $limit) {
							id
							email
							displayName
							roles {
								id
								name
							}
							departmentId
							department {
								id
								name
							}
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
			logger.error('❌ GraphQL Errors in GetEmployeesForReview:');
			employeesData.errors.forEach((err: any, idx: number) => {
				logger.error(`  Error ${idx + 1}:`, {
					message: err.message,
					path: err.path,
					extensions: err.extensions
				});
			});
		}

		const employees = employeesData.data?.users || [];

		// Query 1.5: Get available goals for the selected employee (if provided)
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		let availableGoals: any[] = [];
		if (employeeId) {
			const goalsResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: cookieHeader
				},
				body: JSON.stringify({
					query: `
						query GetEmployeeGoals($employeeId: UUID!, $limit: Int!) {
							employeeGoals(employeeId: $employeeId, limit: $limit) {
								id
								goalTitle
								goalDescription
								targetDate
								status
								progressPercentage
								createdAt
							}
						}
					`,
					variables: { employeeId, limit: 100 }
				})
			});

			const goalsData = await goalsResponse.json();

			if (goalsData.errors && goalsData.errors.length > 0) {
				logger.error('❌ GraphQL Errors in GetEmployeeGoals:');
				goalsData.errors.forEach((err: any, idx: number) => {
					logger.error(`  Error ${idx + 1}:`, {
						message: err.message,
						path: err.path,
						extensions: err.extensions
					});
				});
			}

			// Transform employeeGoals response to match expected format
			const employeeGoals = goalsData.data?.employeeGoals || [];
			availableGoals = employeeGoals.map((goal: any) => ({
				id: goal.id,
				title: goal.goalTitle,
				description: goal.goalDescription,
				targetDate: goal.targetDate,
				status: goal.status,
				progressPercentage: goal.progressPercentage,
				createdAt: goal.createdAt
			}));
		}

		// Query 2: Get selected employee details if provided
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		let selectedEmployee = null;
		if (employeeId) {
			const employeeResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: cookieHeader
				},
				body: JSON.stringify({
					query: `
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
								department {
									id
									name
								}
							}
						}
					`,
					variables: { employeeId }
				})
			});

			const employeeData = await employeeResponse.json();

			if (employeeData.data?.user) {
				selectedEmployee = employeeData.data.user;
			}
		}

		// Query 3: Get review types metadata
		// NOTE: reviewTypesMetadata field does not exist in Rust GraphQL backend
		// Using hardcoded metadata based on ReviewType enum in backend
		const reviewTypesMetadata: Array<{
			value: string;
			label: string;
			description: string;
			displayOrder: number;
		}> = [
			{
				value: 'ANNUAL_REVIEW',
				label: 'Annual Review',
				description: 'Comprehensive yearly performance evaluation',
				displayOrder: 1
			},
			{
				value: 'MID_YEAR_REVIEW',
				label: 'Mid-Year Review',
				description: 'Semi-annual performance check-in',
				displayOrder: 2
			},
			{
				value: 'QUARTERLY_REVIEW',
				label: 'Quarterly Review',
				description: 'Quarterly performance assessment',
				displayOrder: 3
			},
			{
				value: 'PROBATIONARY_REVIEW',
				label: 'Probationary Review',
				description: 'Review during probationary period',
				displayOrder: 4
			},
			{
				value: 'NINETY_DAY_REVIEW',
				label: '90-Day Review',
				description: 'Initial 90-day performance evaluation',
				displayOrder: 5
			},
			{
				value: 'PERFORMANCE_IMPROVEMENT_PLAN',
				label: 'Performance Improvement Plan',
				description: 'Structured plan for performance improvement',
				displayOrder: 6
			},
			{
				value: 'PROJECT_BASED_REVIEW',
				label: 'Project-Based Review',
				description: 'Review focused on specific project completion',
				displayOrder: 7
			},
			{
				value: 'PROMOTION_REVIEW',
				label: 'Promotion Review',
				description: 'Evaluation for promotion consideration',
				displayOrder: 8
			},
			{
				value: 'SELF_REVIEW',
				label: 'Self Review',
				description: 'Employee self-assessment',
				displayOrder: 9
			},
			{
				value: 'EXIT_REVIEW',
				label: 'Exit Review',
				description: 'Final review upon employee departure',
				displayOrder: 10
			}
		];

		return {
			user: {
				id: userId,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: userRole
			},
			employees,
			selectedEmployee,
			reviewTypesMetadata,
			availableGoals
		};
	} catch (err) {
		logger.error('Error loading review creation page:', err as Error);

		// Provide review types even on error so dropdown still works
		const reviewTypesMetadata = [
			{
				value: 'ANNUAL_REVIEW',
				label: 'Annual Review',
				description: 'Comprehensive yearly performance evaluation',
				displayOrder: 1
			},
			{
				value: 'MID_YEAR_REVIEW',
				label: 'Mid-Year Review',
				description: 'Semi-annual performance check-in',
				displayOrder: 2
			},
			{
				value: 'QUARTERLY_REVIEW',
				label: 'Quarterly Review',
				description: 'Quarterly performance assessment',
				displayOrder: 3
			},
			{
				value: 'PROBATIONARY_REVIEW',
				label: 'Probationary Review',
				description: 'Review during probationary period',
				displayOrder: 4
			},
			{
				value: 'NINETY_DAY_REVIEW',
				label: '90-Day Review',
				description: 'Initial 90-day performance evaluation',
				displayOrder: 5
			},
			{
				value: 'PERFORMANCE_IMPROVEMENT_PLAN',
				label: 'Performance Improvement Plan',
				description: 'Structured plan for performance improvement',
				displayOrder: 6
			},
			{
				value: 'PROJECT_BASED_REVIEW',
				label: 'Project-Based Review',
				description: 'Review focused on specific project completion',
				displayOrder: 7
			},
			{
				value: 'PROMOTION_REVIEW',
				label: 'Promotion Review',
				description: 'Evaluation for promotion consideration',
				displayOrder: 8
			},
			{
				value: 'SELF_REVIEW',
				label: 'Self Review',
				description: 'Employee self-assessment',
				displayOrder: 9
			},
			{
				value: 'EXIT_REVIEW',
				label: 'Exit Review',
				description: 'Final review upon employee departure',
				displayOrder: 10
			}
		];

		return {
			user: {
				id: userId,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: userRole
			},
			employees: [],
			selectedEmployee: null,
			reviewTypesMetadata,
			availableGoals: [],
			error: `Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`
		};
	}
};

export const actions: Actions = {
	/**
	 * Create a new performance review (always starts as DRAFT)
	 */
	createReview: async ({ request, cookies, locals }) => {
		try {
			// Forward session cookies for authentication
			const cookieHeader = request.headers.get('cookie') || '';

			const formData = await request.formData();

			const employeeId = formData.get('employeeId') as string;
			const reviewType = formData.get('reviewType') as string;
			const reviewPeriodStart = formData.get('reviewPeriodStart') as string;
			const reviewPeriodEnd = formData.get('reviewPeriodEnd') as string;
			const notes = formData.get('notes') as string;

			// Parse goalIds (multiple values with same name)
			const goalIds = formData.getAll('goalIds') as string[];

			// Parse newGoals from structured hidden inputs
			const newGoals: any[] = [];
			let goalIndex = 0;
			while (formData.has(`newGoals[${goalIndex}].title`)) {
				newGoals.push({
					title: formData.get(`newGoals[${goalIndex}].title`) as string,
					description: formData.get(`newGoals[${goalIndex}].description`) as string,
					targetCompletionDate: formData.get(
						`newGoals[${goalIndex}].targetCompletionDate`
					) as string,
					successMetrics: formData.get(`newGoals[${goalIndex}].successMetrics`) as string
				});
				goalIndex++;
			}

			// Validate required fields
			if (!employeeId || !reviewType) {
				return fail(400, {
					error: 'Employee and Review Type are required',
					success: false
				});
			}

			// Validate date range if both dates provided
			if (reviewPeriodStart && reviewPeriodEnd) {
				if (new Date(reviewPeriodStart) >= new Date(reviewPeriodEnd)) {
					return fail(400, {
						error: 'Review period end date must be after start date',
						success: false
					});
				}
			}

			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Get current user ID as reviewer
			const reviewerId = locals.user?.id;

			if (!reviewerId) {
				return fail(401, {
					error: 'Authentication required',
					success: false
				});
			}

			// Step 1: Create review cycle with review type and date range
			let cycleId: string | null = null;
			if (reviewType && reviewPeriodStart && reviewPeriodEnd) {
				const cycleName = `Review - ${employeeId.slice(0, 8)} - ${reviewType}`;
				const cycleResponse = await fetch(graphqlEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Cookie: cookieHeader
					},
					body: JSON.stringify({
						query: `
							mutation CreateReviewCycle($input: CreateReviewCycleInput!) {
								createReviewCycle(input: $input) {
									id
									name
									reviewType
								}
							}
						`,
						variables: {
							input: {
								name: cycleName,
								description: notes || null,
								reviewType,
								startDate: new Date(reviewPeriodStart).toISOString(),
								endDate: new Date(reviewPeriodEnd).toISOString()
							}
						}
					})
				});

				const cycleData = await cycleResponse.json();
				if (cycleData.errors) {
					logger.error('❌ GraphQL Errors in createReviewCycle:', cycleData.errors);
					return fail(500, {
						error: `Failed to create review cycle: ${cycleData.errors[0].message}`,
						success: false
					});
				}
				cycleId = cycleData.data?.createReviewCycle?.id;
			}

			// Step 2: Create performance review
			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: cookieHeader
				},
				body: JSON.stringify({
					query: `
						mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
							createPerformanceReview(input: $input) {
								id
								employeeId
								reviewerId
								status
							}
						}
					`,
					variables: {
						input: {
							employeeId,
							reviewerId,
							cycleId,
							templateId: null
						}
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				logger.error('❌ GraphQL Errors in createPerformanceReview:');
				result.errors.forEach((err: any, idx: number) => {
					logger.error(`  Error ${idx + 1}:`, {
						message: err.message,
						path: err.path,
						extensions: err.extensions
					});
				});

				return fail(500, {
					error: result.errors[0]?.message || 'Failed to create review',
					success: false
				});
			}

			const reviewId = result.data?.createPerformanceReview?.id;

			if (!reviewId) {
				return fail(500, {
					error: 'Review created but ID not returned',
					success: false
				});
			}

			// Step 3: Create review goals if provided
			if (goalIds.length > 0 || newGoals.length > 0) {
				// TODO: Implement goal association via backend mutations
				// For now, goals will need to be added via the review detail page
				logger.info('⚠️ Goal association not yet implemented - add goals via review detail page');
			}

			// Redirect to the review detail page
			redirect(303, `/dashboard/reviews/${reviewId}`);
		} catch (err) {
			// If it's a redirect, re-throw it
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}

			logger.error('Error creating review:', err as Error);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create review',
				success: false
			});
		}
	}
};
