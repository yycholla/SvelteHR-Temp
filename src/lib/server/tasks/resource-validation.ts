/**
 * Resource Validation Service for Task Linked Resources
 * Feature: 028-task-system-expansion - T024
 *
 * Validates linked resources (Employee, Document, Goal, Performance Review)
 * before they are linked to tasks and provides availability checking.
 *
 * Resource types:
 * - Employee: User records
 * - Document: Document records
 * - Goal: Goal/OKR records
 * - Performance_Review: Performance review records
 */

import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { AvailabilityStatus, ResourceType } from '$lib/types/task';

/**
 * Resource validation result
 */
export interface ResourceValidationResult {
	valid: boolean;
	exists: boolean;
	accessible: boolean;
	availabilityStatus: AvailabilityStatus;
	resourceTitle?: string;
	error?: string;
	metadata?: Record<string, any>;
}

/**
 * Linked resource info
 */
export interface LinkedResourceInfo {
	resourceType: ResourceType;
	resourceId: string;
	resourceTitle: string;
	availabilityStatus: AvailabilityStatus;
	lastChecked: Date;
}

/**
 * Validate an employee resource
 */
async function validateEmployeeResource(employeeId: string): Promise<ResourceValidationResult> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query ValidateEmployee($employeeId: UUID!) {
						userById(id: $employeeId) {
							id
							displayName
							email
							archived
							archivedAt
						}
					}
				`,
				variables: { employeeId }
			})
		});

		if (!response.ok) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Failed to fetch employee'
			};
		}

		const data = await response.json();
		const employee = data?.data?.userById;

		if (!employee) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Employee not found'
			};
		}

		// Check if employee is archived
		if (employee.archived) {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: employee.displayName,
				error: 'Employee is archived'
			};
		}

		return {
			valid: true,
			exists: true,
			accessible: true,
			availabilityStatus: 'Available',
			resourceTitle: employee.displayName,
			metadata: {
				email: employee.email
			}
		};
	} catch (error) {
		console.error('[Resource Validation] Error validating employee:', error);
		return {
			valid: false,
			exists: false,
			accessible: false,
			availabilityStatus: 'Unavailable',
			error: 'Error checking employee'
		};
	}
}

/**
 * Validate a document resource
 */
async function validateDocumentResource(documentId: string): Promise<ResourceValidationResult> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query ValidateDocument($documentId: UUID!) {
						documentById(id: $documentId) {
							id
							title
							fileName
							archived
							archivedAt
						}
					}
				`,
				variables: { documentId }
			})
		});

		if (!response.ok) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Failed to fetch document'
			};
		}

		const data = await response.json();
		const document = data?.data?.documentById;

		if (!document) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Document not found'
			};
		}

		// Check if document is archived
		if (document.archived) {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: document.title || document.fileName,
				error: 'Document is archived'
			};
		}

		return {
			valid: true,
			exists: true,
			accessible: true,
			availabilityStatus: 'Available',
			resourceTitle: document.title || document.fileName,
			metadata: {
				fileName: document.fileName
			}
		};
	} catch (error) {
		console.error('[Resource Validation] Error validating document:', error);
		return {
			valid: false,
			exists: false,
			accessible: false,
			availabilityStatus: 'Unavailable',
			error: 'Error checking document'
		};
	}
}

/**
 * Validate a goal resource
 */
async function validateGoalResource(goalId: string): Promise<ResourceValidationResult> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query ValidateGoal($goalId: UUID!) {
						goalById(id: $goalId) {
							id
							title
							status
							archived
						}
					}
				`,
				variables: { goalId }
			})
		});

		if (!response.ok) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Failed to fetch goal'
			};
		}

		const data = await response.json();
		const goal = data?.data?.goalById;

		if (!goal) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Goal not found'
			};
		}

		// Check if goal is archived
		if (goal.archived) {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: goal.title,
				error: 'Goal is archived'
			};
		}

		// Check if goal is cancelled
		if (goal.status === 'cancelled' || goal.status === 'Cancelled') {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: goal.title,
				error: 'Goal is cancelled'
			};
		}

		return {
			valid: true,
			exists: true,
			accessible: true,
			availabilityStatus: 'Available',
			resourceTitle: goal.title,
			metadata: {
				status: goal.status
			}
		};
	} catch (error) {
		console.error('[Resource Validation] Error validating goal:', error);
		return {
			valid: false,
			exists: false,
			accessible: false,
			availabilityStatus: 'Unavailable',
			error: 'Error checking goal'
		};
	}
}

/**
 * Validate a performance review resource
 */
async function validatePerformanceReviewResource(
	reviewId: string
): Promise<ResourceValidationResult> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query ValidatePerformanceReview($reviewId: UUID!) {
						performanceReviewById(id: $reviewId) {
							id
							title
							status
							archived
							employeeId
						}
					}
				`,
				variables: { reviewId }
			})
		});

		if (!response.ok) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Failed to fetch performance review'
			};
		}

		const data = await response.json();
		const review = data?.data?.performanceReviewById;

		if (!review) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Performance review not found'
			};
		}

		// Check if review is archived
		if (review.archived) {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: review.title,
				error: 'Performance review is archived'
			};
		}

		return {
			valid: true,
			exists: true,
			accessible: true,
			availabilityStatus: 'Available',
			resourceTitle: review.title,
			metadata: {
				status: review.status,
				employeeId: review.employeeId
			}
		};
	} catch (error) {
		console.error('[Resource Validation] Error validating performance review:', error);
		return {
			valid: false,
			exists: false,
			accessible: false,
			availabilityStatus: 'Unavailable',
			error: 'Error checking performance review'
		};
	}
}

/**
 * Validate a linked resource based on type
 */
export async function validateLinkedResource(
	resourceType: ResourceType,
	resourceId: string
): Promise<ResourceValidationResult> {
	switch (resourceType) {
		case 'Employee':
			return validateEmployeeResource(resourceId);
		case 'Document':
			return validateDocumentResource(resourceId);
		case 'Goal':
			return validateGoalResource(resourceId);
		case 'Performance_Review':
			return validatePerformanceReviewResource(resourceId);
		default:
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: `Unknown resource type: ${resourceType}`
			};
	}
}

/**
 * Batch validate multiple linked resources
 */
export async function validateMultipleResources(
	resources: { resourceType: ResourceType; resourceId: string }[]
): Promise<Map<string, ResourceValidationResult>> {
	const results = new Map<string, ResourceValidationResult>();

	// Validate all resources in parallel
	const validationPromises = resources.map(async (resource) => {
		const key = `${resource.resourceType}:${resource.resourceId}`;
		const result = await validateLinkedResource(resource.resourceType, resource.resourceId);
		return { key, result };
	});

	const validationResults = await Promise.all(validationPromises);

	validationResults.forEach(({ key, result }) => {
		results.set(key, result);
	});

	return results;
}

/**
 * Update availability status for a linked resource
 */
export async function updateResourceAvailabilityStatus(
	linkedResourceId: string,
	availabilityStatus: AvailabilityStatus
): Promise<boolean> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					mutation UpdateLinkedResourceStatus($input: UpdateLinkedResourceInput!) {
						updateLinkedResourceById(input: $input) {
							linkedResource {
								id
								availabilityStatus
								lastChecked
							}
						}
					}
				`,
				variables: {
					input: {
						id: linkedResourceId,
						linkedResourcePatch: {
							availabilityStatus,
							lastChecked: new Date().toISOString()
						}
					}
				}
			})
		});

		if (!response.ok) {
			console.error('[Resource Validation] Failed to update availability status');
			return false;
		}

		const data = await response.json();

		if (data.errors) {
			console.error('[Resource Validation] GraphQL errors:', data.errors);
			return false;
		}

		return true;
	} catch (error) {
		console.error('[Resource Validation] Error updating availability status:', error);
		return false;
	}
}

/**
 * Check and update availability for all linked resources of a task
 */
export async function checkTaskLinkedResources(taskId: string): Promise<{
	total: number;
	available: number;
	unavailable: number;
	deleted: number;
	errors: number;
}> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		// Fetch all linked resources for the task
		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetTaskLinkedResources($taskId: UUID!) {
						allLinkedResources(condition: { taskId: $taskId }) {
							nodes {
								id
								resourceType
								resourceId
								availabilityStatus
								lastChecked
							}
						}
					}
				`,
				variables: { taskId }
			})
		});

		if (!response.ok) {
			return { total: 0, available: 0, unavailable: 0, deleted: 0, errors: 1 };
		}

		const data = await response.json();
		const linkedResources = data?.data?.allLinkedResources?.nodes || [];

		const stats = {
			total: linkedResources.length,
			available: 0,
			unavailable: 0,
			deleted: 0,
			errors: 0
		};

		// Validate each linked resource
		for (const linkedResource of linkedResources) {
			const validation = await validateLinkedResource(
				linkedResource.resourceType,
				linkedResource.resourceId
			);

			// Update availability status if changed
			if (validation.availabilityStatus !== linkedResource.availabilityStatus) {
				await updateResourceAvailabilityStatus(linkedResource.id, validation.availabilityStatus);
			}

			// Update stats
			switch (validation.availabilityStatus) {
				case 'Available':
					stats.available++;
					break;
				case 'Unavailable':
					stats.unavailable++;
					stats.deleted++; // Count unavailable as deleted for backwards compatibility
					break;
				case 'Pending':
					// Pending resources are not counted in any category yet
					break;
			}

			if (!validation.valid) {
				stats.errors++;
			}
		}

		return stats;
	} catch (error) {
		console.error('[Resource Validation] Error checking task linked resources:', error);
		return { total: 0, available: 0, unavailable: 0, deleted: 0, errors: 1 };
	}
}

/**
 * Periodically check and update all linked resources
 * Can be called from a cron job or background task
 */
export async function periodicResourceCheck(): Promise<{
	tasksChecked: number;
	resourcesChecked: number;
	resourcesUpdated: number;
}> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get all tasks with linked resources that haven't been checked in the last 24 hours
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetTasksForResourceCheck($oneDayAgo: Datetime!) {
						allTasks(
							condition: { archived: false }
							filter: {
								linkedResourcesByTaskId: {
									some: {
										lastChecked: { lessThan: $oneDayAgo }
									}
								}
							}
						) {
							nodes {
								id
							}
						}
					}
				`,
				variables: { oneDayAgo }
			})
		});

		if (!response.ok) {
			return { tasksChecked: 0, resourcesChecked: 0, resourcesUpdated: 0 };
		}

		const data = await response.json();
		const tasks = data?.data?.allTasks?.nodes || [];

		let resourcesChecked = 0;
		let resourcesUpdated = 0;

		for (const task of tasks) {
			const stats = await checkTaskLinkedResources(task.id);
			resourcesChecked += stats.total;
			resourcesUpdated += stats.unavailable + stats.deleted;
		}

		console.info('[Resource Validation] Periodic check completed:', {
			tasksChecked: tasks.length,
			resourcesChecked,
			resourcesUpdated
		});

		return {
			tasksChecked: tasks.length,
			resourcesChecked,
			resourcesUpdated
		};
	} catch (error) {
		console.error('[Resource Validation] Error in periodic resource check:', error);
		return { tasksChecked: 0, resourcesChecked: 0, resourcesUpdated: 0 };
	}
}

/**
 * Get linked resources for a task with validation status
 */
export async function getTaskLinkedResourcesWithStatus(
	taskId: string
): Promise<LinkedResourceInfo[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetTaskLinkedResources($taskId: UUID!) {
						allLinkedResources(condition: { taskId: $taskId }) {
							nodes {
								id
								resourceType
								resourceId
								resourceTitle
								availabilityStatus
								lastChecked
							}
						}
					}
				`,
				variables: { taskId }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		const linkedResources = data?.data?.allLinkedResources?.nodes || [];

		return linkedResources.map((resource: any) => ({
			resourceType: resource.resourceType,
			resourceId: resource.resourceId,
			resourceTitle: resource.resourceTitle,
			availabilityStatus: resource.availabilityStatus,
			lastChecked: new Date(resource.lastChecked)
		}));
	} catch (error) {
		console.error('[Resource Validation] Error fetching linked resources with status:', error);
		return [];
	}
}
