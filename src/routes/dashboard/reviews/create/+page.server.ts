/**
 * Performance Review Creation Page - Server Load & Actions
 * Feature: 023-reviews-creation-it
 *
 * Server-side data loading and mutation handling for review creation page
 */

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	// Check if user can create reviews
	const canCreate =
		userRole === 'admin' ||
		userRole === 'super_admin' ||
		userRole === 'hr_manager' ||
		userRole === 'manager';

	if (!canCreate) {
		throw error(403, 'You do not have permission to create reviews');
	}

	// Get employee ID from URL parameter (optional)
	const employeeId = url.searchParams.get('employee');

	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Query 1: Get all employees for employee selector
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		const employeesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: `
					query GetEmployeesForReview($limit: Int!) {
						users(limit: $limit) {
							id
							email
							displayName
							role
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
			console.error('❌ GraphQL Errors in GetEmployeesForReview:');
			employeesData.errors.forEach((err: any, idx: number) => {
				console.error(`  Error ${idx + 1}:`, {
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
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: `
						query GetEmployeeGoals($employeeId: UUID!, $limit: Int!) {
							goals(
								limit: $limit,
								filter: {
									employeeId: { equalTo: $employeeId },
									deleted: { equalTo: false },
									status: { equalTo: ACTIVE }
								}
							) {
								id
								title
								description
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
				console.error('❌ GraphQL Errors in GetEmployeeGoals:');
				goalsData.errors.forEach((err: any, idx: number) => {
					console.error(`  Error ${idx + 1}:`, {
						message: err.message,
						path: err.path,
						extensions: err.extensions
					});
				});
			}

			availableGoals = goalsData.data?.goals || [];
		}

		// Query 2: Get selected employee details if provided
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		let selectedEmployee = null;
		if (employeeId) {
			const employeeResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: `
						query GetEmployee($employeeId: UUID!) {
							users(limit: 1, filter: { id: { equalTo: $employeeId } }) {
								id
								displayName
								email
								role
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

			if (employeeData.data?.users && employeeData.data.users.length > 0) {
				selectedEmployee = employeeData.data.users[0];
			}
		}

		// Query 3: Get review types metadata
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		const client = GraphQLClient.fromCookies(cookies);
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

		return {
			user: {
				id: userId,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: userRole
			},
			employees,
			selectedEmployee,
			reviewTypesMetadata: metadataData?.reviewTypesMetadata || [],
			availableGoals
		};
	} catch (err) {
		console.error('Error loading review creation page:', err);

		return {
			user: {
				id: userId,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: userRole
			},
			employees: [],
			selectedEmployee: null,
			reviewTypesMetadata: [],
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
					targetCompletionDate: formData.get(`newGoals[${goalIndex}].targetCompletionDate`) as string,
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

			// Call create_review_with_goals function
			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: `
						mutation CreateReviewWithGoals(
							$employeeId: UUID!
							$reviewerId: UUID!
							$reviewType: ReviewType!
							$reviewPeriodStart: Date
							$reviewPeriodEnd: Date
							$notes: String
							$goalIds: [UUID!]
							$newGoals: JSON
						) {
							createReviewWithGoals(
								input: {
									pEmployeeId: $employeeId
									pReviewerId: $reviewerId
									pReviewType: $reviewType
									pReviewPeriodStart: $reviewPeriodStart
									pReviewPeriodEnd: $reviewPeriodEnd
									pNotes: $notes
									pGoalIds: $goalIds
									pNewGoals: $newGoals
								}
							) {
								json
							}
						}
					`,
					variables: {
						employeeId,
						reviewerId,
						reviewType,
						reviewPeriodStart: reviewPeriodStart || null,
						reviewPeriodEnd: reviewPeriodEnd || null,
						notes: notes || null,
						goalIds: goalIds.length > 0 ? goalIds : null,
						newGoals: newGoals.length > 0 ? newGoals : null
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				console.error('❌ GraphQL Errors in createReviewWithGoals:');
				result.errors.forEach((err: any, idx: number) => {
					console.error(`  Error ${idx + 1}:`, {
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

			const mutationResult = result.data?.createReviewWithGoals?.json;

			if (!mutationResult?.success) {
				return fail(400, {
					error: mutationResult?.message || 'Failed to create review',
					success: false
				});
			}

			const reviewId = mutationResult.review?.id;

			if (!reviewId) {
				return fail(500, {
					error: 'Review created but ID not returned',
					success: false
				});
			}

			// Redirect to the review detail page
			throw redirect(303, `/dashboard/reviews/${reviewId}`);
		} catch (err) {
			// If it's a redirect, re-throw it
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}

			console.error('Error creating review:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create review',
				success: false
			});
		}
	}
};
