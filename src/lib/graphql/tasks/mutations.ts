import { gql } from '@urql/svelte';

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create task
 * Backend: Rust idiomatic - createTask not create_task
 * RLS: Automatic permission checking
 */
export const CREATE_TASK = gql`
	mutation CreateTask($input: CreateTaskInput!) {
		createTask(input: $input) {
			id
			title
			description
			status
			priority
			dueDate
			assigneeId
			departmentId
			projectId
			estimatedHours
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
 * Mutation: Update task
 * Backend: Rust idiomatic - updateTask(id, input) not update_task
 */
export const UPDATE_TASK = gql`
	mutation UpdateTask($id: UUID!, $input: UpdateTaskInput!) {
		updateTask(id: $id, input: $input) {
			id
			title
			description
			status
			priority
			dueDate
			assigneeId
			estimatedHours
			actualHours
			tags
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
 * Mutation: Delete task
 * Backend: Rust idiomatic - deleteTask(id) returns Boolean
 */
export const DELETE_TASK = gql`
	mutation DeleteTask($id: UUID!) {
		deleteTask(id: $id)
	}
`;

/**
 * Mutation: Change task status
 * Backend: Dedicated mutation for status changes
 */
export const CHANGE_TASK_STATUS = gql`
	mutation ChangeTaskStatus($input: ChangeTaskStatusInput!) {
		changeTaskStatus(input: $input) {
			id
			status
			updatedAt
		}
	}
`;

/**
 * Mutation: Assign task to user
 * Backend: Dedicated mutation for task assignment
 */
export const ASSIGN_TASK = gql`
	mutation AssignTaskToUser($input: AssignTaskInput!) {
		assignTaskToUser(input: $input) {
			id
			taskId
			userId
			role
			assignedAt
		}
	}
`;

/**
 * Mutation: Create task dependency
 * Backend: Rust idiomatic - createTaskDependency
 */
export const CREATE_TASK_DEPENDENCY = gql`
	mutation CreateTaskDependency($input: CreateTaskDependencyInput!) {
		createTaskDependency(input: $input) {
			id
			taskId
			dependsOnTaskId
			dependencyType
			createdAt
		}
	}
`;

/**
 * Mutation: Delete task dependency
 * Backend: Rust idiomatic - deleteTaskDependency(id) returns Boolean
 */
export const DELETE_TASK_DEPENDENCY = gql`
	mutation DeleteTaskDependency($id: UUID!) {
		deleteTaskDependency(id: $id)
	}
`;

/**
 * Mutation: Create task type
 * Backend: Rust idiomatic - createTaskType
 * RLS: Automatic permission checking
 */
export const CREATE_TASK_TYPE = gql`
	mutation CreateTaskType($input: CreateTaskTypeInput!) {
		createTaskType(input: $input) {
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
 * Mutation: Update task type
 * Backend: Rust idiomatic - updateTaskType(id, input)
 */
export const UPDATE_TASK_TYPE = gql`
	mutation UpdateTaskType($id: UUID!, $input: UpdateTaskTypeInput!) {
		updateTaskType(id: $id, input: $input) {
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
 * Mutation: Delete task type
 * Backend: Rust idiomatic - deleteTaskType(id) returns Boolean
 * Note: This is a soft delete via isActive flag
 */
export const DELETE_TASK_TYPE = gql`
	mutation DeleteTaskType($id: UUID!) {
		deleteTaskType(id: $id)
	}
`;
