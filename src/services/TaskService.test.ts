// src/services/TaskService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from './TaskService';
import type {
	TaskRepository,
	CreateTaskData,
	UpdateTaskData,
	TaskFilter
} from './ports/TaskRepository';
import {
	Task,
	TaskTitle,
	TaskDescription,
	TaskStatus,
	TaskPriority,
	TaskNotFoundError
} from '$domain/Task';
import { Result } from '$domain/Result';

// Mock repository
class MockTaskRepository implements TaskRepository {
	private tasks: Map<string, Task> = new Map();
	private idCounter = 0;

	async findById(id: string): Promise<Result<Task, TaskNotFoundError>> {
		const task = this.tasks.get(id);
		if (!task) {
			return Result.error(new TaskNotFoundError(id));
		}
		return Result.ok(task);
	}

	async findAll(filter?: TaskFilter): Promise<Result<Task[], never>> {
		return Result.ok(Array.from(this.tasks.values()));
	}

	async create(data: CreateTaskData): Promise<Result<Task, never>> {
		const title = TaskTitle.create(data.title).value;
		const description = TaskDescription.create(data.description).value;

		const task = Task.create({
			id: `task-${++this.idCounter}`,
			title,
			description,
			status: TaskStatus.TODO,
			priority: TaskPriority.MEDIUM,
			createdBy: 'user-123',
			assigneeId: data.assigneeId,
			createdAt: new Date(),
			updatedAt: new Date()
		}).value;

		this.tasks.set(task.id, task);
		return Result.ok(task);
	}

	async update(id: string, data: UpdateTaskData): Promise<Result<Task, TaskNotFoundError>> {
		const existingResult = await this.findById(id);
		if (existingResult.isError) {
			return existingResult;
		}

		const existing = existingResult.value;
		const title = data.title ? TaskTitle.create(data.title).value : existing.title;
		const description =
			data.description !== undefined
				? TaskDescription.create(data.description).value
				: existing.description;

		const updated = Task.create({
			id: existing.id,
			title,
			description,
			status: existing.status,
			priority: existing.priority,
			createdBy: existing.createdBy,
			assigneeId: data.assigneeId ?? existing.assigneeId,
			createdAt: existing.createdAt,
			updatedAt: new Date()
		}).value;

		this.tasks.set(id, updated);
		return Result.ok(updated);
	}

	async delete(id: string): Promise<Result<void, TaskNotFoundError>> {
		if (!this.tasks.has(id)) {
			return Result.error(new TaskNotFoundError(id));
		}
		this.tasks.delete(id);
		return Result.ok(undefined);
	}

	async findSubtasks(parentId: string): Promise<Result<Task[], never>> {
		return Result.ok([]);
	}
}

describe('TaskService', () => {
	let service: TaskService;
	let repository: MockTaskRepository;

	beforeEach(() => {
		repository = new MockTaskRepository();
		service = new TaskService(repository);
	});

	describe('getTaskById', () => {
		it('should return task when found', async () => {
			const createResult = await repository.create({
				title: 'Test Task',
				description: 'Test description'
			});
			const taskId = createResult.value.id;

			const result = await service.getTaskById(taskId);

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Test Task');
		});

		it('should return error when task not found', async () => {
			const result = await service.getTaskById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TaskNotFoundError);
		});
	});

	describe('createTask', () => {
		it('should create task with valid data', async () => {
			const result = await service.createTask({
				title: 'New Task',
				description: 'Task description',
				assigneeId: 'user-456'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('New Task');
			expect(result.value.assigneeId).toBe('user-456');
		});

		it('should reject empty title', async () => {
			const result = await service.createTask({
				title: '',
				description: 'Description'
			});

			expect(result.isError).toBe(true);
		});

		it('should create task without optional fields', async () => {
			const result = await service.createTask({
				title: 'Minimal Task'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.description.isEmpty()).toBe(true);
		});
	});

	describe('updateTask', () => {
		it('should update task title', async () => {
			const createResult = await repository.create({
				title: 'Original Title',
				description: 'Description'
			});
			const taskId = createResult.value.id;

			const result = await service.updateTask(taskId, {
				title: 'Updated Title'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated Title');
		});

		it('should return error when updating nonexistent task', async () => {
			const result = await service.updateTask('nonexistent', {
				title: 'New Title'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TaskNotFoundError);
		});
	});

	describe('deleteTask', () => {
		it('should delete existing task', async () => {
			const createResult = await repository.create({
				title: 'Task to Delete',
				description: 'Will be deleted'
			});
			const taskId = createResult.value.id;

			const result = await service.deleteTask(taskId);

			expect(result.isOk).toBe(true);

			// Verify task is deleted
			const getResult = await service.getTaskById(taskId);
			expect(getResult.isError).toBe(true);
		});

		it('should return error when deleting nonexistent task', async () => {
			const result = await service.deleteTask('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TaskNotFoundError);
		});
	});

	describe('getAllTasks', () => {
		it('should return all tasks', async () => {
			await repository.create({ title: 'Task 1' });
			await repository.create({ title: 'Task 2' });
			await repository.create({ title: 'Task 3' });

			const result = await service.getAllTasks();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(3);
		});

		it('should return empty array when no tasks exist', async () => {
			const result = await service.getAllTasks();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});
});
