// Task Queries
import { gql } from '@urql/svelte';

/**
 * Query: Get all tasks with filtering, sorting, and pagination
 * Backend: Rust idiomatic pattern - uses TaskFilter input object
 * RLS: Automatic RBAC filtering
 */
export const GET_ALL_TASKS = gql`
	query GetAllTasks($filter: TaskFilter, $limit: Int = 20, $offset: Int = 0) {
		tasks(filter: $filter, limit: $limit, offset: $offset) {
			id
			title
			description
			assigneeId
			departmentId
			status
			priority
			dueDate
			estimatedHours
			actualHours
			tags
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get single task by ID
 * Backend: Rust idiomatic pattern - task(id) not taskById
 */
export const GET_TASK = gql`
	query GetTask($id: UUID!) {
		task(id: $id) {
			id
			title
			description
			assigneeId
			departmentId
			projectId
			status
			priority
			dueDate
			estimatedHours
			actualHours
			tags
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get current user's tasks
 * Note: Use filter object with assigneeId field
 */
export const GET_MY_TASKS = gql`
	query GetMyTasks($filter: TaskFilter!, $limit: Int = 20, $offset: Int = 0) {
		tasks(filter: $filter, limit: $limit, offset: $offset) {
			id
			title
			description
			status
			priority
			dueDate
			estimatedHours
			actualHours
			tags
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get all task types
 * Backend: Rust idiomatic pattern - direct array return
 * RLS: Automatic RBAC filtering
 */
export const GET_TASK_TYPES = gql`
	query GetTaskTypes($isActive: Boolean) {
		taskTypes(isActive: $isActive) {
			id
			name
			description
			defaultPriority
			colorCode
			isActive
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get single task type by ID
 * Backend: Rust idiomatic pattern - taskType(id) not taskTypeById
 */
export const GET_TASK_TYPE = gql`
	query GetTaskType($id: UUID!) {
		taskType(id: $id) {
			id
			name
			description
			defaultPriority
			colorCode
			isActive
			createdAt
			updatedAt
		}
	}
`;