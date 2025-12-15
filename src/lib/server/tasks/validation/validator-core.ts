import { logger } from '$lib/utils/logger';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { AvailabilityStatus, ResourceType } from '$lib/types/task';
import type { LinkedResourceInfo, ResourceValidationResult } from './types';
import { validateEmployeeResource } from './employee-validator';
import { validateDocumentResource } from './document-validator';
import { validatePerformanceReviewResource } from './review-validator';

/**
 * Validate a linked resource based on type
 */
export async function validateLinkedResource(
	resourceType: ResourceType,
	resourceId: string
): Promise<ResourceValidationResult> {
	switch (resourceType) {
		case 'employee':
			return validateEmployeeResource(resourceId);
		case 'document':
			return validateDocumentResource(resourceId);
		case 'performance_review':
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
			logger.error('[Resource Validation] Failed to update availability status');
			return false;
		}

		const data = await response.json();

		if (data.errors) {
			logger.error('[Resource Validation] GraphQL errors:', data.errors);
			return false;
		}

		return true;
	} catch (error) {
		logger.error('Error updating resource availability status', error as Error);
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
		logger.error('Error checking task linked resources', error as Error);
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

		logger.info('[Resource Validation] Periodic check completed:', {
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
		logger.error('Error running periodic resource check', error as Error);
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
		logger.error('Error fetching task linked resources', error as Error);
		return [];
	}
}
