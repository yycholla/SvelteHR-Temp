// src/services/ComplianceService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceService } from './ComplianceService';
import { ComplianceArea, ComplianceScore, ComplianceStatus } from '$domain/Compliance';
import {
	ComplianceAreaNotFoundError,
	InvalidComplianceError
} from '$domain/Compliance';
import { Result } from '$domain/Result';
import type { ComplianceRepository } from './ports/ComplianceRepository';

// Helper to create a valid ComplianceArea for tests
function createTestArea(overrides: Partial<{
	id: string;
	name: string;
	score: number;
	status: string;
}> = {}): ComplianceArea {
	const result = ComplianceArea.create({
		id: overrides.id ?? 'area-uuid-001',
		name: overrides.name ?? 'Data Privacy (GDPR)',
		description: 'Test compliance area',
		score: overrides.score ?? 85,
		status: overrides.status ?? 'compliant',
		lastReviewDate: new Date(2026, 0, 1),
		nextReviewDate: new Date(2099, 11, 31),
		createdAt: new Date(2025, 0, 1),
		updatedAt: new Date(2026, 0, 1)
	});

	if (result.isError) throw new Error(`Test setup failed: ${result.error.message}`);
	return result.value;
}

function createMockRepository(): ComplianceRepository {
	return {
		findById: vi.fn(),
		findAll: vi.fn(),
		findDueForReview: vi.fn(),
		findByStatus: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	};
}

describe('ComplianceService', () => {
	let repository: ComplianceRepository;
	let service: ComplianceService;

	beforeEach(() => {
		repository = createMockRepository();
		service = new ComplianceService(repository);
	});

	describe('getById()', () => {
		it('should return a compliance area when found', async () => {
			const area = createTestArea();
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(area));

			const result = await service.getById('area-uuid-001');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('area-uuid-001');
		});

		it('should return ComplianceAreaNotFoundError when area is null', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(null));

			const result = await service.getById('non-existent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ComplianceAreaNotFoundError);
			expect(result.error.code).toBe('COMPLIANCE_AREA_NOT_FOUND');
		});

		it('should propagate repository errors', async () => {
			const repoError = new InvalidComplianceError('Repository error');
			vi.mocked(repository.findById).mockResolvedValue(Result.error(repoError));

			const result = await service.getById('area-uuid-001');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Repository error');
		});

		it('should handle unexpected exceptions', async () => {
			vi.mocked(repository.findById).mockRejectedValue(new Error('Unexpected error'));

			const result = await service.getById('area-uuid-001');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Unexpected error');
		});
	});

	describe('getAll()', () => {
		it('should return all compliance areas', async () => {
			const areas = [createTestArea({ id: 'area-1' }), createTestArea({ id: 'area-2' })];
			vi.mocked(repository.findAll).mockResolvedValue(Result.ok(areas));

			const result = await service.getAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return an empty array when no areas exist', async () => {
			vi.mocked(repository.findAll).mockResolvedValue(Result.ok([]));

			const result = await service.getAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle repository errors', async () => {
			vi.mocked(repository.findAll).mockRejectedValue(new Error('DB error'));

			const result = await service.getAll();

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('DB error');
		});
	});

	describe('getDueForReview()', () => {
		it('should return areas due for review', async () => {
			const overdueArea = ComplianceArea.create({
				id: 'area-overdue',
				name: 'Employment Law',
				score: 70,
				status: 'warning',
				lastReviewDate: new Date(2020, 0, 1),
				nextReviewDate: new Date(2020, 6, 1),
				createdAt: new Date(2020, 0, 1),
				updatedAt: new Date(2020, 0, 1)
			}).value;

			vi.mocked(repository.findDueForReview).mockResolvedValue(Result.ok([overdueArea]));

			const result = await service.getDueForReview();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].isDueForReview()).toBe(true);
		});

		it('should handle unexpected exceptions', async () => {
			vi.mocked(repository.findDueForReview).mockRejectedValue(new Error('Network error'));

			const result = await service.getDueForReview();

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Network error');
		});
	});

	describe('getByStatus()', () => {
		it('should return areas with the specified status', async () => {
			const areas = [createTestArea({ status: 'warning' })];
			vi.mocked(repository.findByStatus).mockResolvedValue(Result.ok(areas));

			const result = await service.getByStatus('warning');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(repository.findByStatus).toHaveBeenCalledOnce();
		});

		it('should reject an invalid status value', async () => {
			const result = await service.getByStatus('invalid-status');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidComplianceError);
		});

		it('should handle unexpected exceptions', async () => {
			vi.mocked(repository.findByStatus).mockRejectedValue(new Error('Unexpected'));

			const result = await service.getByStatus('compliant');

			expect(result.isError).toBe(true);
		});
	});

	describe('create()', () => {
		it('should create a new compliance area', async () => {
			const area = createTestArea();
			vi.mocked(repository.create).mockResolvedValue(Result.ok(area));

			const result = await service.create(area);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(area.id);
		});

		it('should handle repository errors on create', async () => {
			const area = createTestArea();
			vi.mocked(repository.create).mockRejectedValue(new Error('Create failed'));

			const result = await service.create(area);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Create failed');
		});
	});

	describe('update()', () => {
		it('should update an existing compliance area', async () => {
			const area = createTestArea();
			const newScore = ComplianceScore.create(95).value;
			const newStatus = ComplianceStatus.create('compliant').value;
			const updatedArea = area.updateScore(newScore, newStatus);

			vi.mocked(repository.update).mockResolvedValue(Result.ok(updatedArea));

			const result = await service.update(updatedArea);

			expect(result.isOk).toBe(true);
			expect(result.value.score.value).toBe(95);
		});

		it('should handle repository errors on update', async () => {
			const area = createTestArea();
			vi.mocked(repository.update).mockRejectedValue(new Error('Update failed'));

			const result = await service.update(area);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Update failed');
		});
	});

	describe('delete()', () => {
		it('should delete a compliance area', async () => {
			vi.mocked(repository.delete).mockResolvedValue(Result.ok(undefined));

			const result = await service.delete('area-uuid-001');

			expect(result.isOk).toBe(true);
		});

		it('should handle repository errors on delete', async () => {
			vi.mocked(repository.delete).mockRejectedValue(new Error('Delete failed'));

			const result = await service.delete('area-uuid-001');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Delete failed');
		});
	});

	describe('getOverallScore()', () => {
		it('should return 0 when there are no areas', async () => {
			vi.mocked(repository.findAll).mockResolvedValue(Result.ok([]));

			const result = await service.getOverallScore();

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(0);
		});

		it('should calculate the average score across all areas', async () => {
			const areas = [
				createTestArea({ score: 80 }),
				createTestArea({ score: 90 }),
				createTestArea({ score: 70 })
			];
			vi.mocked(repository.findAll).mockResolvedValue(Result.ok(areas));

			const result = await service.getOverallScore();

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(80); // (80 + 90 + 70) / 3
		});

		it('should round the average score', async () => {
			const areas = [
				createTestArea({ score: 80 }),
				createTestArea({ score: 81 }),
				createTestArea({ score: 82 })
			];
			vi.mocked(repository.findAll).mockResolvedValue(Result.ok(areas));

			const result = await service.getOverallScore();

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(81); // (80 + 81 + 82) / 3 = 81
		});

		it('should return a single score when there is one area', async () => {
			const areas = [createTestArea({ score: 92 })];
			vi.mocked(repository.findAll).mockResolvedValue(Result.ok(areas));

			const result = await service.getOverallScore();

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(92);
		});

		it('should propagate repository errors', async () => {
			vi.mocked(repository.findAll).mockResolvedValue(
				Result.error(new InvalidComplianceError('DB error'))
			);

			const result = await service.getOverallScore();

			expect(result.isError).toBe(true);
		});

		it('should handle unexpected exceptions', async () => {
			vi.mocked(repository.findAll).mockRejectedValue(new Error('Network failure'));

			const result = await service.getOverallScore();

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Network failure');
		});
	});
});
