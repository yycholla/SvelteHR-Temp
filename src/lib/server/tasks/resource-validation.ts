/**
 * Resource Validation Service for Task Linked Resources
 * Feature: 028-task-system-expansion - T024
 *
 * Validates linked resources (employee, document, performance_review)
 * before they are linked to tasks and provides availability checking.
 *
 * Refactored: Moved to src/lib/server/tasks/validation/
 */

export * from './validation/index';
