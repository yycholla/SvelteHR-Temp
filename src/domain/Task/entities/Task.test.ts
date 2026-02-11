// src/domain/Task/entities/Task.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Task } from './Task';
import { TaskTitle } from '../value-objects/TaskTitle';
import { TaskDescription } from '../value-objects/TaskDescription';
import { DueDate } from '../value-objects/DueDate';
import { TaskStatus } from '../enums/TaskStatus';
import { TaskPriority } from '../enums/TaskPriority';
import { InvalidStatusTransitionError } from '../errors/TaskErrors';

describe('Task', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-11T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('create', () => {
		it('should create valid task with required fields', () => {
			const title = TaskTitle.create('Fix bug').value;
			const description = TaskDescription.create('Details here').value;

			const result = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.TODO,
				priority: TaskPriority.HIGH,
				createdBy: 'user-123',
				createdAt: new Date('2026-02-11T10:00:00Z'),
				updatedAt: new Date('2026-02-11T10:00:00Z')
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('task-123');
			expect(result.value.title.value).toBe('Fix bug');
			expect(result.value.status).toBe(TaskStatus.TODO);
			expect(result.value.priority).toBe(TaskPriority.HIGH);
		});

		it('should create task with optional due date', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const dueDate = DueDate.create(new Date('2026-02-15T12:00:00Z')).value;

			const result = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.TODO,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				dueDate
			});

			expect(result.isOk).toBe(true);
			expect(result.value.dueDate?.value).toEqual(dueDate.value);
		});

		it('should create task with assignee', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;

			const result = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.TODO,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				assigneeId: 'user-456',
				createdAt: new Date(),
				updatedAt: new Date()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.assigneeId).toBe('user-456');
		});
	});

	describe('changeStatus', () => {
		it('should allow valid status transition', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const task = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.TODO,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const result = task.changeStatus(TaskStatus.IN_PROGRESS);

			expect(result.isOk).toBe(true);
			expect(result.value.status).toBe(TaskStatus.IN_PROGRESS);
		});

		it('should reject invalid status transition', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const task = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.DONE,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const result = task.changeStatus(TaskStatus.IN_PROGRESS);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidStatusTransitionError);
		});

		it('should update completedAt when transitioning to DONE', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const task = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.REVIEW,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const result = task.changeStatus(TaskStatus.DONE);

			expect(result.isOk).toBe(true);
			expect(result.value.completedAt).toBeDefined();
			expect(result.value.completedAt?.getTime()).toBeCloseTo(Date.now(), -2);
		});
	});

	describe('reassign', () => {
		it('should reassign to new user', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const task = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.TODO,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				assigneeId: 'user-456',
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const reassigned = task.reassign('user-789');

			expect(reassigned.assigneeId).toBe('user-789');
		});

		it('should allow unassigning task', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const task = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.TODO,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				assigneeId: 'user-456',
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const unassigned = task.reassign(undefined);

			expect(unassigned.assigneeId).toBeUndefined();
		});
	});

	describe('isOverdue', () => {
		it('should return false when no due date', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const task = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.TODO,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(task.isOverdue()).toBe(false);
		});

		it('should return false for completed task', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const dueDate = DueDate.create(new Date('2026-02-15T12:00:00Z')).value;
			const task = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.DONE,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				dueDate,
				completedAt: new Date('2026-02-14T12:00:00Z')
			}).value;

			// Advance time past due date
			vi.setSystemTime(new Date('2026-02-16T12:00:00Z'));

			expect(task.isOverdue()).toBe(false);
		});

		it('should return true for incomplete task past due date', () => {
			const title = TaskTitle.create('Task').value;
			const description = TaskDescription.create('').value;
			const dueDate = DueDate.create(new Date('2026-02-13T12:00:00Z')).value;
			const task = Task.create({
				id: 'task-123',
				title,
				description,
				status: TaskStatus.IN_PROGRESS,
				priority: TaskPriority.MEDIUM,
				createdBy: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				dueDate
			}).value;

			// Advance time past due date
			vi.setSystemTime(new Date('2026-02-14T12:00:00Z'));

			expect(task.isOverdue()).toBe(true);
		});
	});
});
