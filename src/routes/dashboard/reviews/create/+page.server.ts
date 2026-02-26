/**
 * Performance Review Creation Page - Server Load & Actions
 * Feature: 023-reviews-creation-it
 * Task: T036
 *
 * Server-side data loading and mutation handling for review creation page
 * Refactored: Phase 2 - Using Phase 1 Foundation utilities
 */

import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { AccessTier } from '$lib/server/rbac-utils';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { logger } from '$lib/utils/logger';

// Review types metadata constant
// NOTE: reviewTypesMetadata field does not exist in Rust GraphQL backend
// Using hardcoded metadata based on ReviewType enum in backend
const REVIEW_TYPES_METADATA = [
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
] as const;

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, AccessTier.TEAM);

	return loader.loadWithClient(async () => {
		const { url, cookies } = event;
		const params = new QueryParamExtractor(url);
		const employeeId = params.getString('employee');

		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Forward session cookies for authentication
		const cookieHeader = event.request.headers.get('cookie') || '';

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Cookie: cookieHeader
		};

		// Query 1: Get all employees for employee selector
		const employeesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
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
				variables: { limit: 200 }
			})
		});

		const employeesData = await employeesResponse.json();

		if (employeesData.errors && employeesData.errors.length > 0) {
			logger.error('❌ GraphQL Errors in GetEmployeesForReview:');
			employeesData.errors.forEach((err: unknown, idx: number) => {
				logger.error(`  Error ${idx + 1}:`, undefined, {
					message: (err as { message?: string }).message,
					path: (err as { path?: unknown }).path,
					extensions: (err as { extensions?: unknown }).extensions
				});
			});
		}

		const employees = employeesData.data?.users || [];

		// Query 2: Get available goals for the selected employee (if provided)
		let availableGoals: unknown[] = [];
		if (employeeId) {
			const goalsResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
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
				goalsData.errors.forEach((err: unknown, idx: number) => {
					logger.error(`  Error ${idx + 1}:`, undefined, {
						message: (err as { message?: string }).message,
						path: (err as { path?: unknown }).path,
						extensions: (err as { extensions?: unknown }).extensions
					});
				});
			}

			// Transform employeeGoals response to match expected format
			const employeeGoals = goalsData.data?.employeeGoals || [];
			availableGoals = employeeGoals.map((goal: unknown) => {
				const g = goal as {
					id: string;
					goalTitle: string;
					goalDescription: string;
					targetDate: string;
					status: string;
					progressPercentage: number;
					createdAt: string;
				};
				return {
					id: g.id,
					title: g.goalTitle,
					description: g.goalDescription,
					targetDate: g.targetDate,
					status: g.status,
					progressPercentage: g.progressPercentage,
					createdAt: g.createdAt
				};
			});
		}

		// Query 3: Get selected employee details if provided
		let selectedEmployee = null;
		if (employeeId) {
			const employeeResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
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

		return {
			employees,
			selectedEmployee,
			reviewTypesMetadata: REVIEW_TYPES_METADATA,
			availableGoals
		};
	});
};

export const actions: Actions = {
	/**
	 * Create a new performance review (always starts as DRAFT)
	 */
	createReview: async (event) => {
		const loader = new RBACDataLoader(event, [
			'performance:write',
			'performance:write:self',
			'performance:write:team',
			'performance:write:all'
		]);

		try {
			const { request } = event;

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
			const reviewerId = loader.getUserId();

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
					logger.error(
						'❌ GraphQL Errors in createReviewCycle',
						new Error(
							(cycleData.errors[0] as { message?: string })?.message || 'Cycle creation failed'
						),
						{
							errors: cycleData.errors.map((e: unknown) => ({
								message: (e as { message?: string }).message
							}))
						}
					);
					return fail(500, {
						error: `Failed to create review cycle: ${(cycleData.errors[0] as { message?: string }).message}`,
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
				logger.error(
					'❌ GraphQL Errors in createPerformanceReview',
					new Error(
						(result.errors[0] as { message?: string })?.message || 'Review creation failed'
					),
					{
						errors: result.errors.map((err: unknown) => ({
							message: (err as { message?: string }).message,
							path: (err as { path?: unknown }).path,
							extensions: (err as { extensions?: unknown }).extensions
						}))
					}
				);

				return fail(500, {
					error: (result.errors[0] as { message?: string })?.message || 'Failed to create review',
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
