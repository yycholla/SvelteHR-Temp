/**
 * Domain Type Extensions
 *
 * This file extends GraphQL-generated types with additional properties that are
 * queried via GraphQL aliases or computed fields. This bridges the gap between
 * the base generated types and what components actually expect.
 *
 * Pattern 10 Fix: Property Naming Mismatches in Domain Types
 */

import type {
	Department as DepartmentBase,
	JobInfosConnection,
	User,
	UsersConnection
} from '$lib/generated/graphql';

// =============================================================================
// Department Extensions
// =============================================================================

/**
 * Extended Department type with GraphQL alias properties
 *
 * GraphQL queries use aliases for certain fields:
 * - `departmentHead` (alias for `userByManagerId`)
 * - `employees` (connection via `jobInfosByDepartmentId`)
 * - `activeEmployees` (filtered connection)
 */
export interface DepartmentExtensions {
	/**
	 * Department head/manager user object
	 * GraphQL alias: departmentHead { id, displayName, email }
	 * Original field: userByManagerId
	 */
	departmentHead?: User | null;

	/**
	 * All employees in this department (via job_info relation)
	 * GraphQL query: employees { totalCount, nodes { ... } }
	 * This is typically a connection through jobInfosByDepartmentId
	 */
	employees?: UsersConnection | null;

	/**
	 * Active employees only (filtered connection)
	 * GraphQL alias: activeEmployees: employees(condition: { isActive: true })
	 */
	activeEmployees?: UsersConnection | null;

	/**
	 * Sub-departments (already in base as departmentsByParentDepartmentId)
	 * Included here for completeness of team management operations
	 */
	subDepartments?: {
		totalCount: number;
		nodes: Array<DepartmentBase>;
	};
}

/**
 * Complete Department type with all extensions
 * Use this type in components that work with team/department data
 */
export type Department = DepartmentBase & DepartmentExtensions;

// =============================================================================
// Task Extensions
// =============================================================================

/**
 * Task Dependency Connection Node
 * Represents a single dependency relationship
 */
export interface TaskDependencyNode {
	id: string;
	blockingTaskId: string;
	blockedTaskId: string;
	dependencyType?: string;
	createdAt: string;

	/** Populated blocking task */
	taskByBlockingTaskId?: {
		id: string;
		title: string;
		status: string;
		priority?: string;
	};

	/** Populated blocked task */
	taskByBlockedTaskId?: {
		id: string;
		title: string;
		status: string;
		priority?: string;
	};
}

/**
 * Task Dependency Connection
 * PostGraphile-style connection for task dependencies
 */
export interface TaskDependencyConnection {
	nodes: TaskDependencyNode[];
	totalCount?: number;
}

/**
 * Extended Task type with GraphQL relationship properties
 *
 * GraphQL queries fetch dependency relationships via connections:
 * - `taskDependenciesByBlockingTaskId` (tasks that THIS task blocks)
 * - `taskDependenciesByBlockedTaskId` (tasks that block THIS task)
 */
export interface TaskExtensions {
	/**
	 * Tasks that this task blocks (outgoing dependencies)
	 * GraphQL: taskDependenciesByBlockingTaskId { nodes { ... } }
	 */
	taskDependenciesByBlockingTaskId?: TaskDependencyConnection;

	/**
	 * Tasks that block this task (incoming dependencies)
	 * GraphQL: taskDependenciesByBlockedTaskId { nodes { ... } }
	 */
	taskDependenciesByBlockedTaskId?: TaskDependencyConnection;

	/**
	 * Subtasks array (optional, for task hierarchy)
	 */
	subtasks?: Array<any>;
}

/**
 * Complete Task type with GraphQL extensions
 * Import this in components using task dependency features
 */
export type Task = import('$lib/types/task').Task & TaskExtensions;

// =============================================================================
// Event Type Re-export
// =============================================================================

/**
 * Event type is already complete in events-operations.ts
 * Re-export it here for convenience
 */
export type { Event } from '$lib/graphql/events-operations';

// =============================================================================
// Re-exports for convenience
// =============================================================================

/**
 * Re-export extended types for easy importing
 *
 * Usage:
 * ```typescript
 * import type { Department, Task, Event } from '$lib/types/domain-extensions';
 * ```
 */
// export type { Department, Task, Event }; // REMOVED: Already exported via interface/type definitions above

/**
 * Re-export connection types for type-safe dependency handling
 */
// export type { TaskDependencyNode, TaskDependencyConnection }; // REMOVED: Already exported via interface definitions above
