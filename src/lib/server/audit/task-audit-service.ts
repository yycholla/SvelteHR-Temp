/**
 * Task Audit Service
 * Feature: 028-task-system-expansion - T021
 *
 * Provides audit logging specifically for task management operations.
 * Tracks all task changes in the task_audit_entries table with detailed
 * before/after snapshots stored in JSONB format.
 *
 * Refactored: Moved to src/lib/server/audit/task/
 */

export * from './task/index';