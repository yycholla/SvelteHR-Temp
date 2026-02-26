/**
 * GraphQL Type Re-exports
 *
 * This file re-exports commonly used GraphQL types from the generated schema.
 * This provides a cleaner import path for components.
 */

// Re-export common GraphQL types from generated schema
export type { Department, User, Maybe, InputMaybe, Scalars } from '$lib/generated/graphql';

// Re-export all types for comprehensive access
export * from '$lib/generated/graphql';

// Manually defined types that are missing from generated schema or are client-side only
export interface PaginationInput {
	limit: number;
	offset: number;
}

export type ReportStatus = 'generating' | 'completed' | 'failed';

export type ReportType =
	| 'attendance'
	| 'performance'
	| 'goals'
	| 'productivity'
	| 'leave'
	| 'custom';

export interface SortInput {
	field: string;
	direction: 'ASC' | 'DESC';
}

export interface TeamReport {
	id: string;
	title: string;
	reportType: ReportType;
	status: ReportStatus;
	dateFrom: string;
	dateTo: string;
	summary?: string;
	isScheduled: boolean;
	scheduleCron?: string;
	team?: {
		id: string;
		name: string;
		departmentHead?: {
			id: string;
			displayName: string;
			email: string;
		};
		employees?: {
			totalCount: number;
		};
	};
	generatedBy: {
		id: string;
		displayName: string;
		email?: string;
		jobTitle?: string;
	};
	parameters?: unknown;
	data?: unknown;
	createdAt: string;
	updatedAt: string;
}
