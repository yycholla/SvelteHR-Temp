import { gql } from '@urql/svelte';

/**
 * Query: Get user's own activities ("My Activities" tab)
 * RLS Policy: activity_user_own_access (employee sees only their own activities)
 * PostGraphile: Uses allActivityLogs and ActivityLogCondition
 */
export const GET_USER_ACTIVITIES = gql`
	query GetUserActivities($userId: UUID, $limit: Int = 50, $offset: Int = 0) {
		activityLogs(userId: $userId, limit: $limit, offset: $offset) {
			id
			employeeId
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
 * RLS Policy: activity_admin_audit_access (admin sees all activities)
 * PostGraphile: Uses allActivityLogs and ActivityLogCondition
 */
export const GET_AUDIT_LOGS = gql`
	query GetAuditLogs(
		$first: Int = 100
		$offset: Int = 0
		$orderBy: [ActivityLogsOrderBy!] = [CREATED_AT_DESC]
		$condition: ActivityLogCondition
	) {
		allActivityLogs(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				employeeId
				userId
				userByEmployeeId {
					id
					displayName
					email
					departmentId
					departmentByDepartmentId {
						id
						name
					}
				}
				action
				resourceType
				resourceId
				details
				beforeSnapshot
				afterSnapshot
				isRollback
				rolledBackLogId
				ipAddress
				userAgent
				createdAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
`;

/**
 * Query: Get activity history for specific resource
 * PostGraphile: Uses allActivityLogs and condition parameter
 */
export const GET_RESOURCE_ACTIVITY_HISTORY = gql`
	query GetResourceActivityHistory($resourceType: String!, $resourceId: UUID!, $first: Int = 20) {
		allActivityLogs(
			first: $first
			condition: { resourceType: $resourceType, resourceId: $resourceId }
			orderBy: [CREATED_AT_DESC]
		) {
			nodes {
				id
				employeeId
				userId
				userByEmployeeId {
					id
					displayName
					email
				}
				action
				resourceType
				resourceId
				details
				createdAt
			}
			totalCount
		}
	}
`;

/**
 * Query: Get activities by date range
 * PostGraphile: Uses allActivityLogs, date filtering done server-side
 */
export const GET_ACTIVITIES_BY_DATE_RANGE = gql`
	query GetActivitiesByDateRange($employeeId: UUID, $first: Int = 1000) {
		allActivityLogs(
			first: $first
			condition: { employeeId: $employeeId }
			orderBy: [CREATED_AT_DESC]
		) {
			nodes {
				id
				employeeId
				userId
				action
				resourceType
				resourceId
				details
				createdAt
			}
			totalCount
		}
	}
`;

/**
 * Query: Get single activity log by ID
 * PostGraphile: Uses allActivityLogs with condition filter
 */
export const GET_ACTIVITY_LOG_BY_ID = gql`
	query GetActivityLogById($id: UUID!) {
		allActivityLogs(condition: { id: $id }, first: 1) {
			nodes {
				id
				employeeId
				userId
				action
				resourceType
				resourceId
				beforeSnapshot
				afterSnapshot
				isRollback
				rolledBackLogId
				details
				createdAt
				ipAddress
				userAgent
				userByEmployeeId {
					id
					displayName
					email
					departmentId
					departmentByDepartmentId {
						id
						name
					}
				}
			}
		}
	}
`;
