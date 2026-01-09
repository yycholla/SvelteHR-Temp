import { gql } from '@urql/svelte';

/**
 * Query: Get user's own activities ("My Activities" tab)
 * RLS Policy: Applied in Rust backend - user sees only their own activities
 * Backend: Uses activityLogs from Rust GraphQL schema
 */
export const GET_USER_ACTIVITIES = gql`
	query GetUserActivities($userId: UUID, $limit: Int = 50, $offset: Int = 0) {
		activityLogs(userId: $userId, limit: $limit, offset: $offset) {
			id
			userId
			action
			resourceType
			resourceId
			details
			ipAddress
			userAgent
			createdAt
		}
	}
`;

/**
 * Query: Get all system activities ("Audit Logs" tab - admin only)
 * RLS Policy: Applied in Rust backend - only admins can see all activities
 * Backend: Uses activityLogs and activityLogsCount from Rust GraphQL schema
 */
export const GET_AUDIT_LOGS = gql`
	query GetAuditLogs($userId: UUID, $limit: Int = 100, $offset: Int = 0) {
		activityLogs(userId: $userId, limit: $limit, offset: $offset) {
			id
			userId
			action
			resourceType
			resourceId
			details
			ipAddress
			userAgent
			createdAt
		}
		activityLogsCount(userId: $userId)
	}
`;

/**
 * Query: Get activity history for specific resource
 * Backend: Uses activityLogs from Rust GraphQL schema
 * Note: Filtering by resourceType/resourceId done client-side
 */
export const GET_RESOURCE_ACTIVITY_HISTORY = gql`
	query GetResourceActivityHistory($userId: UUID, $limit: Int = 20, $offset: Int = 0) {
		activityLogs(userId: $userId, limit: $limit, offset: $offset) {
			id
			userId
			action
			resourceType
			resourceId
			details
			createdAt
		}
	}
`;

/**
 * Query: Get activities by date range
 * Backend: Uses activityLogs from Rust GraphQL schema
 * Note: Date filtering done client-side, user filtering by userId
 */
export const GET_ACTIVITIES_BY_DATE_RANGE = gql`
	query GetActivitiesByDateRange($userId: UUID, $limit: Int = 1000, $offset: Int = 0) {
		activityLogs(userId: $userId, limit: $limit, offset: $offset) {
			id
			userId
			action
			resourceType
			resourceId
			details
			createdAt
		}
		activityLogsCount(userId: $userId)
	}
`;

/**
 * Query: Get single activity log by ID
 * Backend: Uses activityLog (singular) from Rust GraphQL schema
 */
export const GET_ACTIVITY_LOG_BY_ID = gql`
	query GetActivityLogById($id: UUID!) {
		activityLog(id: $id) {
			id
			userId
			action
			resourceType
			resourceId
			details
			createdAt
			ipAddress
			userAgent
		}
	}
`;
