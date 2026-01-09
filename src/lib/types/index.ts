/**
 * Core Type Definitions for SvelteHR
 *
 * Centralized TypeScript interfaces and types for the HR management system.
 * These types align with the Hasura GraphQL schema and provide type safety across
 * the frontend application.
 * Refactored: Moved to src/lib/types/domain/
 */

// Removing wildcard export to avoid conflicts with Domain types
// export * from '../generated/graphql';

export * from './domain/enums';
export * from './domain/nested';
export * from './domain/role-permission';
export * from './domain/user';
export * from './domain/department';
export * from './domain/task';
export * from './domain/leave';
export * from './domain/attendance';
export * from './domain/hr-request';
export * from './domain/common';

// Re-export commonly used types aliases
import type { User } from './domain/user';
import type { LeaveRequest } from './domain/leave';
import type { AttendanceRecord } from './domain/attendance';

export type Employee = User;
export type Leave = LeaveRequest;
export type Attendance = AttendanceRecord;

// Re-export user mapper utilities
export * from './user-mapper';
