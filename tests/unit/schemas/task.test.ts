/**
 * Unit Tests: Task Validation Schemas
 * Feature: 028-task-system-expansion - T059
 *
 * Tests all Zod validation schemas for task system including create, update, and dependency schemas.
 */

import { describe, it, expect } from 'vitest';
import {
	taskStatusSchema,
	taskPrioritySchema,
	resourceTypeSchema,
	auditActionTypeSchema,
	createTaskSchema,
	updateTaskSchema,
	createTaskDependencySchema,
	createLinkedResourceSchema,
	createTaskTypeSchema,
	taskFilterSchema,
	taskSortOptionsSchema,
	parseDateInput
} from '$lib/schemas/task';

describe('Enum Schemas', () => {
	describe('taskStatusSchema', () => {
		it('should accept valid task statuses', () => {
			expect(taskStatusSchema.parse('To Do')).toBe('To Do');
			expect(taskStatusSchema.parse('In Progress')).toBe('In Progress');
			expect(taskStatusSchema.parse('Blocked')).toBe('Blocked');
			expect(taskStatusSchema.parse('Deferred')).toBe('Deferred');
			expect(taskStatusSchema.parse('Completed')).toBe('Completed');
		});

		it('should reject invalid task statuses', () => {
			expect(() => taskStatusSchema.parse('Invalid')).toThrow();
			expect(() => taskStatusSchema.parse('completed')).toThrow(); // lowercase
			expect(() => taskStatusSchema.parse('')).toThrow();
		});
	});

	describe('taskPrioritySchema', () => {
		it('should accept valid task priorities', () => {
			expect(taskPrioritySchema.parse('Low')).toBe('Low');
			expect(taskPrioritySchema.parse('Medium')).toBe('Medium');
			expect(taskPrioritySchema.parse('High')).toBe('High');
			expect(taskPrioritySchema.parse('Urgent')).toBe('Urgent');
		});

		it('should reject invalid priorities', () => {
			expect(() => taskPrioritySchema.parse('Critical')).toThrow();
			expect(() => taskPrioritySchema.parse('low')).toThrow(); // lowercase
		});
	});

	describe('resourceTypeSchema', () => {
		it('should accept valid resource types', () => {
			expect(resourceTypeSchema.parse('assessment')).toBe('assessment');
			expect(resourceTypeSchema.parse('document')).toBe('document');
			expect(resourceTypeSchema.parse('training')).toBe('training');
			expect(resourceTypeSchema.parse('event')).toBe('event');
			expect(resourceTypeSchema.parse('other')).toBe('other');
		});

		it('should reject invalid resource types', () => {
			expect(() => resourceTypeSchema.parse('unknown')).toThrow();
		});
	});

	describe('auditActionTypeSchema', () => {
		it('should accept valid audit action types', () => {
			expect(auditActionTypeSchema.parse('created')).toBe('created');
			expect(auditActionTypeSchema.parse('edited')).toBe('edited');
			expect(auditActionTypeSchema.parse('reassigned')).toBe('reassigned');
			expect(auditActionTypeSchema.parse('deleted')).toBe('deleted');
			expect(auditActionTypeSchema.parse('status_changed')).toBe('status_changed');
			expect(auditActionTypeSchema.parse('org_change')).toBe('org_change');
		});

		it('should reject invalid action types', () => {
			expect(() => auditActionTypeSchema.parse('unknown')).toThrow();
		});
	});
});

describe('createTaskSchema', () => {
	const validTaskData = {
		title: 'Complete project documentation',
		description: 'Write comprehensive docs for the new feature',
		assigneeId: '123e4567-e89b-12d3-a456-426614174000',
		taskTypeId: '223e4567-e89b-12d3-a456-426614174000',
		status: 'To Do',
		priority: 'High',
		dueDate: new Date('2024-12-31')
	};

	describe('Valid Scenarios', () => {
		it('should accept fully valid task data', () => {
			const result = createTaskSchema.parse(validTaskData);
			expect(result.title).toBe('Complete project documentation');
			expect(result.assigneeId).toBe('123e4567-e89b-12d3-a456-426614174000');
		});

		it('should accept minimal required fields', () => {
			const minimalData = {
				title: 'Simple task',
				assigneeId: '123e4567-e89b-12d3-a456-426614174000',
				taskTypeId: '223e4567-e89b-12d3-a456-426614174000'
			};
			const result = createTaskSchema.parse(minimalData);
			expect(result.title).toBe('Simple task');
			expect(result.status).toBe('To Do'); // Default
			expect(result.priority).toBe('Medium'); // Default
		});

		it('should trim whitespace from title', () => {
			const data = {
				...validTaskData,
				title: '  Trimmed Title  '
			};
			const result = createTaskSchema.parse(data);
			expect(result.title).toBe('Trimmed Title');
		});

		it('should accept task with parent task ID', () => {
			const data = {
				...validTaskData,
				parentTaskId: '323e4567-e89b-12d3-a456-426614174000'
			};
			const result = createTaskSchema.parse(data);
			expect(result.parentTaskId).toBe('323e4567-e89b-12d3-a456-426614174000');
		});

		it('should accept task with linked resources', () => {
			const data = {
				...validTaskData,
				linkedResources: [
					{
						resourceType: 'document',
						resourceId: '423e4567-e89b-12d3-a456-426614174000',
						resourceTitle: 'Related Document'
					}
				]
			};
			const result = createTaskSchema.parse(data);
			expect(result.linkedResources).toHaveLength(1);
			expect(result.linkedResources![0].resourceType).toBe('document');
		});
	});

	describe('Title Validation', () => {
		it('should reject empty title', () => {
			const data = { ...validTaskData, title: '' };
			expect(() => createTaskSchema.parse(data)).toThrow('Title is required');
		});

		it('should reject title with only whitespace', () => {
			const data = { ...validTaskData, title: '   ' };
			expect(() => createTaskSchema.parse(data)).toThrow('Title is required');
		});

		it('should reject title exceeding 255 characters', () => {
			const data = { ...validTaskData, title: 'a'.repeat(256) };
			expect(() => createTaskSchema.parse(data)).toThrow('Title must be 255 characters or less');
		});

		it('should accept title at 255 character limit', () => {
			const data = { ...validTaskData, title: 'a'.repeat(255) };
			const result = createTaskSchema.parse(data);
			expect(result.title).toHaveLength(255);
		});
	});

	describe('UUID Validation', () => {
		it('should reject invalid assigneeId UUID', () => {
			const data = { ...validTaskData, assigneeId: 'invalid-uuid' };
			expect(() => createTaskSchema.parse(data)).toThrow('Invalid assignee ID');
		});

		it('should reject invalid taskTypeId UUID', () => {
			const data = { ...validTaskData, taskTypeId: 'invalid-uuid' };
			expect(() => createTaskSchema.parse(data)).toThrow('Invalid task type ID');
		});

		it('should reject invalid parentTaskId UUID', () => {
			const data = { ...validTaskData, parentTaskId: 'not-a-uuid' };
			expect(() => createTaskSchema.parse(data)).toThrow('Invalid parent task ID');
		});
	});

	describe('Linked Resources Validation', () => {
		it('should reject linked resource with invalid UUID', () => {
			const data = {
				...validTaskData,
				linkedResources: [
					{
						resourceType: 'document',
						resourceId: 'invalid-uuid',
						resourceTitle: 'Test'
					}
				]
			};
			expect(() => createTaskSchema.parse(data)).toThrow('Invalid resource ID');
		});

		it('should reject linked resource without title', () => {
			const data = {
				...validTaskData,
				linkedResources: [
					{
						resourceType: 'document',
						resourceId: '423e4567-e89b-12d3-a456-426614174000',
						resourceTitle: ''
					}
				]
			};
			expect(() => createTaskSchema.parse(data)).toThrow('Resource title is required');
		});

		it('should reject invalid resource type', () => {
			const data = {
				...validTaskData,
				linkedResources: [
					{
						resourceType: 'invalid',
						resourceId: '423e4567-e89b-12d3-a456-426614174000',
						resourceTitle: 'Test'
					}
				]
			};
			expect(() => createTaskSchema.parse(data)).toThrow();
		});
	});
});

describe('updateTaskSchema', () => {
	describe('Valid Scenarios', () => {
		it('should accept partial updates', () => {
			const update = { title: 'Updated Title' };
			const result = updateTaskSchema.parse(update);
			expect(result.title).toBe('Updated Title');
		});

		it('should accept multiple field updates', () => {
			const update = {
				title: 'New Title',
				status: 'In Progress',
				priority: 'Urgent'
			};
			const result = updateTaskSchema.parse(update);
			expect(result.title).toBe('New Title');
			expect(result.status).toBe('In Progress');
			expect(result.priority).toBe('Urgent');
		});

		it('should accept empty object (no updates)', () => {
			const result = updateTaskSchema.parse({});
			expect(result).toEqual({});
		});

		it('should accept null for nullable fields', () => {
			const update = {
				dueDate: null,
				parentTaskId: null
			};
			const result = updateTaskSchema.parse(update);
			expect(result.dueDate).toBeNull();
			expect(result.parentTaskId).toBeNull();
		});

		it('should trim whitespace from title', () => {
			const update = { title: '  Updated Title  ' };
			const result = updateTaskSchema.parse(update);
			expect(result.title).toBe('Updated Title');
		});
	});

	describe('Title Validation', () => {
		it('should reject empty title', () => {
			const update = { title: '' };
			expect(() => updateTaskSchema.parse(update)).toThrow('Title cannot be empty');
		});

		it('should reject title with only whitespace', () => {
			const update = { title: '   ' };
			expect(() => updateTaskSchema.parse(update)).toThrow('Title cannot be empty');
		});

		it('should reject title exceeding 255 characters', () => {
			const update = { title: 'a'.repeat(256) };
			expect(() => updateTaskSchema.parse(update)).toThrow();
		});
	});

	describe('UUID Validation', () => {
		it('should reject invalid UUIDs', () => {
			expect(() => updateTaskSchema.parse({ assigneeId: 'invalid' })).toThrow();
			expect(() => updateTaskSchema.parse({ taskTypeId: 'invalid' })).toThrow();
			expect(() => updateTaskSchema.parse({ parentTaskId: 'invalid' })).toThrow();
		});
	});
});

describe('createTaskDependencySchema', () => {
	const validDependency = {
		blockingTaskId: '123e4567-e89b-12d3-a456-426614174000',
		blockedTaskId: '223e4567-e89b-12d3-a456-426614174000',
		dependencyType: 'must_complete_before'
	};

	describe('Valid Scenarios', () => {
		it('should accept valid dependency', () => {
			const result = createTaskDependencySchema.parse(validDependency);
			expect(result.blockingTaskId).toBe('123e4567-e89b-12d3-a456-426614174000');
			expect(result.blockedTaskId).toBe('223e4567-e89b-12d3-a456-426614174000');
		});

		it('should default dependencyType if not provided', () => {
			const data = {
				blockingTaskId: '123e4567-e89b-12d3-a456-426614174000',
				blockedTaskId: '223e4567-e89b-12d3-a456-426614174000'
			};
			const result = createTaskDependencySchema.parse(data);
			expect(result.dependencyType).toBe('must_complete_before');
		});
	});

	describe('Self-Dependency Prevention', () => {
		it('should reject when blockingTaskId equals blockedTaskId', () => {
			const sameId = '123e4567-e89b-12d3-a456-426614174000';
			const data = {
				blockingTaskId: sameId,
				blockedTaskId: sameId
			};
			expect(() => createTaskDependencySchema.parse(data)).toThrow(
				'A task cannot depend on itself'
			);
		});
	});

	describe('UUID Validation', () => {
		it('should reject invalid blockingTaskId', () => {
			const data = { ...validDependency, blockingTaskId: 'invalid' };
			expect(() => createTaskDependencySchema.parse(data)).toThrow('Invalid blocking task ID');
		});

		it('should reject invalid blockedTaskId', () => {
			const data = { ...validDependency, blockedTaskId: 'invalid' };
			expect(() => createTaskDependencySchema.parse(data)).toThrow('Invalid blocked task ID');
		});
	});
});

describe('createLinkedResourceSchema', () => {
	const validResource = {
		taskId: '123e4567-e89b-12d3-a456-426614174000',
		resourceType: 'document',
		resourceId: '223e4567-e89b-12d3-a456-426614174000',
		resourceTitle: 'Important Document'
	};

	describe('Valid Scenarios', () => {
		it('should accept valid linked resource', () => {
			const result = createLinkedResourceSchema.parse(validResource);
			expect(result.taskId).toBe('123e4567-e89b-12d3-a456-426614174000');
			expect(result.resourceType).toBe('document');
		});

		it('should accept all resource types', () => {
			const types = ['assessment', 'document', 'training', 'event', 'other'];
			types.forEach((type) => {
				const data = { ...validResource, resourceType: type };
				const result = createLinkedResourceSchema.parse(data);
				expect(result.resourceType).toBe(type);
			});
		});
	});

	describe('Validation Errors', () => {
		it('should reject invalid taskId', () => {
			const data = { ...validResource, taskId: 'invalid' };
			expect(() => createLinkedResourceSchema.parse(data)).toThrow('Invalid task ID');
		});

		it('should reject invalid resourceId', () => {
			const data = { ...validResource, resourceId: 'invalid' };
			expect(() => createLinkedResourceSchema.parse(data)).toThrow('Invalid resource ID');
		});

		it('should reject empty resourceTitle', () => {
			const data = { ...validResource, resourceTitle: '' };
			expect(() => createLinkedResourceSchema.parse(data)).toThrow('Resource title is required');
		});

		it('should reject invalid resourceType', () => {
			const data = { ...validResource, resourceType: 'invalid' };
			expect(() => createLinkedResourceSchema.parse(data)).toThrow();
		});
	});
});

describe('createTaskTypeSchema', () => {
	describe('Valid Scenarios', () => {
		it('should accept valid task type', () => {
			const data = {
				name: 'Development Task',
				description: 'Tasks related to software development'
			};
			const result = createTaskTypeSchema.parse(data);
			expect(result.name).toBe('Development Task');
			expect(result.description).toBe('Tasks related to software development');
		});

		it('should accept task type without description', () => {
			const data = { name: 'Simple Type' };
			const result = createTaskTypeSchema.parse(data);
			expect(result.name).toBe('Simple Type');
			expect(result.description).toBeUndefined();
		});

		it('should trim whitespace from name', () => {
			const data = { name: '  Trimmed Name  ' };
			const result = createTaskTypeSchema.parse(data);
			expect(result.name).toBe('Trimmed Name');
		});
	});

	describe('Name Validation', () => {
		it('should reject empty name', () => {
			const data = { name: '' };
			expect(() => createTaskTypeSchema.parse(data)).toThrow('Task type name is required');
		});

		it('should reject name with only whitespace', () => {
			const data = { name: '   ' };
			expect(() => createTaskTypeSchema.parse(data)).toThrow('Task type name is required');
		});

		it('should reject name exceeding 100 characters', () => {
			const data = { name: 'a'.repeat(101) };
			expect(() => createTaskTypeSchema.parse(data)).toThrow(
				'Task type name must be 100 characters or less'
			);
		});

		it('should accept name at 100 character limit', () => {
			const data = { name: 'a'.repeat(100) };
			const result = createTaskTypeSchema.parse(data);
			expect(result.name).toHaveLength(100);
		});
	});
});

describe('taskFilterSchema', () => {
	describe('Valid Scenarios', () => {
		it('should accept all filter fields', () => {
			const filter = {
				assigneeId: '123e4567-e89b-12d3-a456-426614174000',
				creatorId: '223e4567-e89b-12d3-a456-426614174000',
				taskTypeId: '323e4567-e89b-12d3-a456-426614174000',
				status: 'In Progress',
				priority: 'High',
				archived: false,
				requiresManualReassignment: true,
				search: 'project documentation'
			};
			const result = taskFilterSchema.parse(filter);
			expect(result.status).toBe('In Progress');
			expect(result.archived).toBe(false);
		});

		it('should accept partial filters', () => {
			const filter = { status: 'To Do', priority: 'Urgent' };
			const result = taskFilterSchema.parse(filter);
			expect(result.status).toBe('To Do');
			expect(result.priority).toBe('Urgent');
		});

		it('should accept empty filter', () => {
			const result = taskFilterSchema.parse({});
			expect(result).toEqual({});
		});
	});

	describe('UUID Validation', () => {
		it('should reject invalid UUIDs', () => {
			expect(() => taskFilterSchema.parse({ assigneeId: 'invalid' })).toThrow();
			expect(() => taskFilterSchema.parse({ creatorId: 'invalid' })).toThrow();
			expect(() => taskFilterSchema.parse({ taskTypeId: 'invalid' })).toThrow();
		});
	});
});

describe('taskSortOptionsSchema', () => {
	describe('Valid Scenarios', () => {
		it('should accept all valid sort fields', () => {
			const fields = ['created_at', 'updated_at', 'due_date', 'priority', 'title', 'status'];
			fields.forEach((field) => {
				const data = { field, direction: 'asc' };
				const result = taskSortOptionsSchema.parse(data);
				expect(result.field).toBe(field);
			});
		});

		it('should accept both sort directions', () => {
			const data1 = { field: 'created_at', direction: 'asc' };
			const data2 = { field: 'created_at', direction: 'desc' };
			expect(taskSortOptionsSchema.parse(data1).direction).toBe('asc');
			expect(taskSortOptionsSchema.parse(data2).direction).toBe('desc');
		});
	});

	describe('Validation Errors', () => {
		it('should reject invalid sort field', () => {
			const data = { field: 'invalid_field', direction: 'asc' };
			expect(() => taskSortOptionsSchema.parse(data)).toThrow();
		});

		it('should reject invalid sort direction', () => {
			const data = { field: 'created_at', direction: 'invalid' };
			expect(() => taskSortOptionsSchema.parse(data)).toThrow();
		});
	});
});

describe('parseDateInput', () => {
	it('should return undefined for undefined input', () => {
		expect(parseDateInput(undefined)).toBeUndefined();
	});

	it('should return undefined for null input', () => {
		expect(parseDateInput(null)).toBeUndefined();
	});

	it('should return Date object unchanged', () => {
		const date = new Date('2024-12-31');
		const result = parseDateInput(date);
		expect(result).toBe(date);
	});

	it('should parse valid ISO date string', () => {
		const result = parseDateInput('2024-12-31');
		expect(result).toBeInstanceOf(Date);
		expect(result?.toISOString()).toContain('2024-12-31');
	});

	it('should parse various date string formats', () => {
		const formats = ['2024-12-31', 'December 31, 2024', '12/31/2024', '2024-12-31T23:59:59Z'];
		formats.forEach((format) => {
			const result = parseDateInput(format);
			expect(result).toBeInstanceOf(Date);
			expect(isNaN(result!.getTime())).toBe(false);
		});
	});

	it('should return undefined for invalid date string', () => {
		const result = parseDateInput('not-a-date');
		expect(result).toBeUndefined();
	});

	it('should return undefined for empty string', () => {
		const result = parseDateInput('');
		expect(result).toBeUndefined();
	});
});

describe('Schema Integration Scenarios', () => {
	it('should validate complete task creation workflow', () => {
		const taskData = {
			title: 'Implement user authentication',
			description: 'Add JWT-based auth system',
			assigneeId: '123e4567-e89b-12d3-a456-426614174000',
			taskTypeId: '223e4567-e89b-12d3-a456-426614174000',
			status: 'To Do',
			priority: 'High',
			dueDate: new Date('2024-12-31'),
			linkedResources: [
				{
					resourceType: 'document',
					resourceId: '323e4567-e89b-12d3-a456-426614174000',
					resourceTitle: 'Auth Specification'
				}
			]
		};

		const task = createTaskSchema.parse(taskData);
		expect(task.title).toBe('Implement user authentication');
		expect(task.linkedResources).toHaveLength(1);
	});

	it('should validate task with dependency creation', () => {
		// First task
		const task1 = createTaskSchema.parse({
			title: 'Setup database',
			assigneeId: '123e4567-e89b-12d3-a456-426614174000',
			taskTypeId: '223e4567-e89b-12d3-a456-426614174000'
		});

		// Second task that depends on first
		const dependency = createTaskDependencySchema.parse({
			blockingTaskId: '123e4567-e89b-12d3-a456-426614174000', // task1 ID
			blockedTaskId: '323e4567-e89b-12d3-a456-426614174000' // task2 ID
		});

		expect(dependency.blockingTaskId).toBeTruthy();
		expect(dependency.dependencyType).toBe('must_complete_before');
	});

	it('should validate filtering and sorting together', () => {
		const filter = taskFilterSchema.parse({
			status: 'In Progress',
			priority: 'High',
			archived: false
		});

		const sort = taskSortOptionsSchema.parse({
			field: 'due_date',
			direction: 'asc'
		});

		expect(filter.status).toBe('In Progress');
		expect(sort.field).toBe('due_date');
	});
});
