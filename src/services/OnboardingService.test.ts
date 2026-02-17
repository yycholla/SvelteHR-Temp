// src/services/OnboardingService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnboardingService } from './OnboardingService';
import type { OnboardingRepository } from './ports/OnboardingRepository';
import {
	OnboardingModule,
	OnboardingAssignment,
	OnboardingModuleNotFoundError,
	InvalidOnboardingModuleError,
	AssignmentNotFoundError,
	InvalidAssignmentError,
	ModuleTitle,
	ModuleCategory
} from '$domain/Onboarding';
import { Result } from '$domain/Result';

// --- Test helpers ---

const createTestModule = (): OnboardingModule => {
	return OnboardingModule.create({
		id: '550e8400-e29b-41d4-a716-446655440001',
		title: ModuleTitle.create('Company Orientation').value,
		description: 'Introduction to company policies and culture',
		isActive: true,
		category: ModuleCategory.create('orientation').value,
		tags: ['orientation', 'company'],
		authorId: '550e8400-e29b-41d4-a716-446655440002'
	}).value;
};

const createTestAssignment = (): OnboardingAssignment => {
	return OnboardingAssignment.create({
		id: '550e8400-e29b-41d4-a716-446655440003',
		userId: '550e8400-e29b-41d4-a716-446655440004',
		onboardingModuleId: '550e8400-e29b-41d4-a716-446655440001',
		assignedById: '550e8400-e29b-41d4-a716-446655440002',
		assignedAt: new Date('2026-01-01T09:00:00Z'),
		dueDate: new Date('2026-02-01T09:00:00Z'),
		completedAt: null
	}).value;
};

// --- Tests ---

describe('OnboardingService', () => {
	let mockRepository: OnboardingRepository;
	let service: OnboardingService;
	let mockModule: OnboardingModule;
	let mockAssignment: OnboardingAssignment;

	beforeEach(() => {
		mockModule = createTestModule();
		mockAssignment = createTestAssignment();

		mockRepository = {
			findModuleById: vi.fn(),
			findAllModules: vi.fn(),
			createModule: vi.fn(),
			updateModule: vi.fn(),
			deleteModule: vi.fn(),
			findAssignmentById: vi.fn(),
			findAssignmentsByUserId: vi.fn(),
			findAssignmentsByModuleId: vi.fn(),
			createAssignment: vi.fn(),
			completeAssignment: vi.fn(),
			deleteAssignment: vi.fn()
		};

		service = new OnboardingService(mockRepository);
	});

	// -------------------------------------------------------------------------
	// Module methods
	// -------------------------------------------------------------------------

	describe('getModuleById', () => {
		it('should return module when found', async () => {
			vi.mocked(mockRepository.findModuleById).mockResolvedValue(Result.ok(mockModule));

			const result = await service.getModuleById('550e8400-e29b-41d4-a716-446655440001');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440001');
				expect(result.value.title.value).toBe('Company Orientation');
			}
			expect(mockRepository.findModuleById).toHaveBeenCalledWith(
				'550e8400-e29b-41d4-a716-446655440001'
			);
		});

		it('should return error when module not found', async () => {
			vi.mocked(mockRepository.findModuleById).mockResolvedValue(
				Result.error(new OnboardingModuleNotFoundError('nonexistent-id'))
			);

			const result = await service.getModuleById('nonexistent-id');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findModuleById).mockRejectedValue(new Error('Database error'));

			const result = await service.getModuleById('550e8400-e29b-41d4-a716-446655440001');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('Failed to fetch onboarding module');
				expect(result.error.message).toContain('Database error');
			}
		});
	});

	describe('getAllModules', () => {
		it('should return all modules without filter', async () => {
			vi.mocked(mockRepository.findAllModules).mockResolvedValue(Result.ok([mockModule]));

			const result = await service.getAllModules();

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0].id).toBe('550e8400-e29b-41d4-a716-446655440001');
			}
			expect(mockRepository.findAllModules).toHaveBeenCalledWith(undefined);
		});

		it('should pass filter to repository', async () => {
			vi.mocked(mockRepository.findAllModules).mockResolvedValue(Result.ok([mockModule]));
			const filter = { isActive: true, category: 'orientation' };

			const result = await service.getAllModules(filter);

			expect(result.isOk).toBe(true);
			expect(mockRepository.findAllModules).toHaveBeenCalledWith(filter);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findAllModules).mockRejectedValue(new Error('Connection refused'));

			const result = await service.getAllModules();

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('Failed to fetch onboarding modules');
			}
		});
	});

	describe('createModule', () => {
		it('should return created module on success', async () => {
			vi.mocked(mockRepository.createModule).mockResolvedValue(Result.ok(mockModule));

			const data = {
				title: 'Company Orientation',
				description: 'Introduction to company policies',
				isActive: true,
				category: 'orientation',
				tags: ['orientation'],
				authorId: '550e8400-e29b-41d4-a716-446655440002'
			};

			const result = await service.createModule(data);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.title.value).toBe('Company Orientation');
			}
			expect(mockRepository.createModule).toHaveBeenCalledWith(data);
		});

		it('should return error when repository rejects creation', async () => {
			vi.mocked(mockRepository.createModule).mockResolvedValue(
				Result.error(new InvalidOnboardingModuleError('Title is required'))
			);

			const result = await service.createModule({
				title: '',
				category: 'orientation',
				authorId: '550e8400-e29b-41d4-a716-446655440002'
			});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.createModule).mockRejectedValue(new Error('Disk full'));

			const result = await service.createModule({
				title: 'Test Module',
				category: 'compliance',
				authorId: '550e8400-e29b-41d4-a716-446655440002'
			});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('Failed to create onboarding module');
			}
		});
	});

	describe('updateModule', () => {
		it('should return updated module on success', async () => {
			const updatedModule = OnboardingModule.create({
				id: '550e8400-e29b-41d4-a716-446655440001',
				title: ModuleTitle.create('Updated Orientation').value,
				description: null,
				isActive: false,
				category: ModuleCategory.create('compliance').value,
				tags: [],
				authorId: '550e8400-e29b-41d4-a716-446655440002'
			}).value;

			vi.mocked(mockRepository.updateModule).mockResolvedValue(Result.ok(updatedModule));

			const result = await service.updateModule('550e8400-e29b-41d4-a716-446655440001', {
				title: 'Updated Orientation',
				isActive: false
			});

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.title.value).toBe('Updated Orientation');
				expect(result.value.isActive).toBe(false);
			}
		});

		it('should return error when module not found', async () => {
			vi.mocked(mockRepository.updateModule).mockResolvedValue(
				Result.error(new OnboardingModuleNotFoundError('nonexistent'))
			);

			const result = await service.updateModule('nonexistent', { title: 'New Title' });

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.updateModule).mockRejectedValue(new Error('Transaction failed'));

			const result = await service.updateModule('550e8400-e29b-41d4-a716-446655440001', {
				title: 'New Title'
			});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('Failed to update onboarding module');
			}
		});
	});

	describe('deleteModule', () => {
		it('should return ok on successful deletion', async () => {
			vi.mocked(mockRepository.deleteModule).mockResolvedValue(Result.ok(undefined));

			const result = await service.deleteModule('550e8400-e29b-41d4-a716-446655440001');

			expect(result.isOk).toBe(true);
			expect(mockRepository.deleteModule).toHaveBeenCalledWith(
				'550e8400-e29b-41d4-a716-446655440001'
			);
		});

		it('should return error when module not found', async () => {
			vi.mocked(mockRepository.deleteModule).mockResolvedValue(
				Result.error(new OnboardingModuleNotFoundError('nonexistent'))
			);

			const result = await service.deleteModule('nonexistent');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.deleteModule).mockRejectedValue(new Error('Foreign key constraint'));

			const result = await service.deleteModule('550e8400-e29b-41d4-a716-446655440001');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('Failed to delete onboarding module');
			}
		});
	});

	// -------------------------------------------------------------------------
	// Assignment methods
	// -------------------------------------------------------------------------

	describe('getAssignmentById', () => {
		it('should return assignment when found', async () => {
			vi.mocked(mockRepository.findAssignmentById).mockResolvedValue(Result.ok(mockAssignment));

			const result = await service.getAssignmentById('550e8400-e29b-41d4-a716-446655440003');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440003');
				expect(result.value.userId).toBe('550e8400-e29b-41d4-a716-446655440004');
			}
			expect(mockRepository.findAssignmentById).toHaveBeenCalledWith(
				'550e8400-e29b-41d4-a716-446655440003'
			);
		});

		it('should return error when assignment not found', async () => {
			vi.mocked(mockRepository.findAssignmentById).mockResolvedValue(
				Result.error(new AssignmentNotFoundError('nonexistent-id'))
			);

			const result = await service.getAssignmentById('nonexistent-id');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findAssignmentById).mockRejectedValue(new Error('Timeout'));

			const result = await service.getAssignmentById('550e8400-e29b-41d4-a716-446655440003');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
				expect(result.error.message).toContain('Failed to fetch onboarding assignment');
			}
		});
	});

	describe('getAssignmentsByUserId', () => {
		it('should return all assignments for a user', async () => {
			vi.mocked(mockRepository.findAssignmentsByUserId).mockResolvedValue(
				Result.ok([mockAssignment])
			);

			const result = await service.getAssignmentsByUserId('550e8400-e29b-41d4-a716-446655440004');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0].userId).toBe('550e8400-e29b-41d4-a716-446655440004');
			}
			expect(mockRepository.findAssignmentsByUserId).toHaveBeenCalledWith(
				'550e8400-e29b-41d4-a716-446655440004'
			);
		});

		it('should return empty array when user has no assignments', async () => {
			vi.mocked(mockRepository.findAssignmentsByUserId).mockResolvedValue(Result.ok([]));

			const result = await service.getAssignmentsByUserId('550e8400-e29b-41d4-a716-446655440099');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(0);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findAssignmentsByUserId).mockRejectedValue(
				new Error('Network error')
			);

			const result = await service.getAssignmentsByUserId('550e8400-e29b-41d4-a716-446655440004');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
				expect(result.error.message).toContain('Failed to fetch assignments for user');
			}
		});
	});

	describe('getAssignmentsByModuleId', () => {
		it('should return all assignments for a module', async () => {
			vi.mocked(mockRepository.findAssignmentsByModuleId).mockResolvedValue(
				Result.ok([mockAssignment])
			);

			const result = await service.getAssignmentsByModuleId('550e8400-e29b-41d4-a716-446655440001');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0].onboardingModuleId).toBe('550e8400-e29b-41d4-a716-446655440001');
			}
		});

		it('should return empty array when module has no assignments', async () => {
			vi.mocked(mockRepository.findAssignmentsByModuleId).mockResolvedValue(Result.ok([]));

			const result = await service.getAssignmentsByModuleId('550e8400-e29b-41d4-a716-446655440099');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(0);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findAssignmentsByModuleId).mockRejectedValue(
				new Error('Query failed')
			);

			const result = await service.getAssignmentsByModuleId('550e8400-e29b-41d4-a716-446655440001');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
				expect(result.error.message).toContain('Failed to fetch assignments for module');
			}
		});
	});

	describe('createAssignment', () => {
		it('should return created assignment on success', async () => {
			vi.mocked(mockRepository.createAssignment).mockResolvedValue(Result.ok(mockAssignment));

			const data = {
				userId: '550e8400-e29b-41d4-a716-446655440004',
				onboardingModuleId: '550e8400-e29b-41d4-a716-446655440001',
				assignedById: '550e8400-e29b-41d4-a716-446655440002',
				dueDate: '2026-02-01T09:00:00Z'
			};

			const result = await service.createAssignment(data);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.userId).toBe('550e8400-e29b-41d4-a716-446655440004');
			}
			expect(mockRepository.createAssignment).toHaveBeenCalledWith(data);
		});

		it('should return error when repository rejects creation', async () => {
			vi.mocked(mockRepository.createAssignment).mockResolvedValue(
				Result.error(new InvalidAssignmentError('Invalid user ID'))
			);

			const result = await service.createAssignment({
				userId: 'not-a-uuid',
				onboardingModuleId: '550e8400-e29b-41d4-a716-446655440001',
				assignedById: '550e8400-e29b-41d4-a716-446655440002'
			});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.createAssignment).mockRejectedValue(
				new Error('Unique constraint violated')
			);

			const result = await service.createAssignment({
				userId: '550e8400-e29b-41d4-a716-446655440004',
				onboardingModuleId: '550e8400-e29b-41d4-a716-446655440001',
				assignedById: '550e8400-e29b-41d4-a716-446655440002'
			});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
				expect(result.error.message).toContain('Failed to create onboarding assignment');
			}
		});
	});

	describe('completeAssignment', () => {
		it('should return completed assignment on success', async () => {
			const completedAssignment = OnboardingAssignment.create({
				id: '550e8400-e29b-41d4-a716-446655440003',
				userId: '550e8400-e29b-41d4-a716-446655440004',
				onboardingModuleId: '550e8400-e29b-41d4-a716-446655440001',
				assignedById: '550e8400-e29b-41d4-a716-446655440002',
				assignedAt: new Date('2026-01-01T09:00:00Z'),
				dueDate: new Date('2026-02-01T09:00:00Z'),
				completedAt: new Date('2026-01-20T09:00:00Z')
			}).value;

			vi.mocked(mockRepository.completeAssignment).mockResolvedValue(
				Result.ok(completedAssignment)
			);

			const result = await service.completeAssignment('550e8400-e29b-41d4-a716-446655440003');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.isCompleted()).toBe(true);
				expect(result.value.status).toBe('completed');
			}
			expect(mockRepository.completeAssignment).toHaveBeenCalledWith(
				'550e8400-e29b-41d4-a716-446655440003'
			);
		});

		it('should return error when assignment not found', async () => {
			vi.mocked(mockRepository.completeAssignment).mockResolvedValue(
				Result.error(new AssignmentNotFoundError('nonexistent'))
			);

			const result = await service.completeAssignment('nonexistent');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.completeAssignment).mockRejectedValue(
				new Error('Optimistic lock failure')
			);

			const result = await service.completeAssignment('550e8400-e29b-41d4-a716-446655440003');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
				expect(result.error.message).toContain('Failed to complete onboarding assignment');
			}
		});
	});

	describe('deleteAssignment', () => {
		it('should return ok on successful deletion', async () => {
			vi.mocked(mockRepository.deleteAssignment).mockResolvedValue(Result.ok(undefined));

			const result = await service.deleteAssignment('550e8400-e29b-41d4-a716-446655440003');

			expect(result.isOk).toBe(true);
			expect(mockRepository.deleteAssignment).toHaveBeenCalledWith(
				'550e8400-e29b-41d4-a716-446655440003'
			);
		});

		it('should return error when assignment not found', async () => {
			vi.mocked(mockRepository.deleteAssignment).mockResolvedValue(
				Result.error(new AssignmentNotFoundError('nonexistent'))
			);

			const result = await service.deleteAssignment('nonexistent');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
			}
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.deleteAssignment).mockRejectedValue(
				new Error('Referenced by other records')
			);

			const result = await service.deleteAssignment('550e8400-e29b-41d4-a716-446655440003');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
				expect(result.error.message).toContain('Failed to delete onboarding assignment');
			}
		});
	});
});
