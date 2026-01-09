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
