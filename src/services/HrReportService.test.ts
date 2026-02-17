import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HrReportService } from './HrReportService';
import type { HrReportRepository } from './ports/HrReportRepository';
import { HrReport } from '$domain/HrReport/HrReport';
import { ReportTitle } from '$domain/HrReport/value-objects/ReportTitle';
import { ReportType } from '$domain/HrReport/value-objects/ReportType';
import { ReportStatus } from '$domain/HrReport/value-objects/ReportStatus';
import {
	InvalidHrReportError,
	HrReportNotFoundError
} from '$domain/HrReport/errors/HrReportErrors';
import { Result } from '$domain/Result';

// --- Test constants ---

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '550e8400-e29b-41d4-a716-446655440001';
const VALID_UUID_3 = '550e8400-e29b-41d4-a716-446655440002';

// --- Helpers ---

function createTestReport(): HrReport {
	return HrReport.create({
		id: VALID_UUID,
		creatorId: VALID_UUID_2,
		departmentId: VALID_UUID_3,
		title: ReportTitle.create('Monthly Headcount Report').value,
		reportType: ReportType.create('headcount').value,
		category: 'operational',
		status: ReportStatus.create('draft').value,
		filters: null,
		data: null,
		scheduledAt: null,
		generatedAt: null,
		createdAt: new Date('2025-01-01T00:00:00.000Z'),
		updatedAt: new Date('2025-01-01T00:00:00.000Z')
	}).value;
}

function createMockRepository(): HrReportRepository {
	return {
		findById: vi.fn(),
		findAll: vi.fn(),
		findByDepartment: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		generate: vi.fn()
	};
}

// --- Tests ---

describe('HrReportService', () => {
	let service: HrReportService;
	let mockRepository: HrReportRepository;
	let testReport: HrReport;

	beforeEach(() => {
		mockRepository = createMockRepository();
		service = new HrReportService(mockRepository);
		testReport = createTestReport();
	});

	describe('getById()', () => {
		it('should return a report when found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(testReport));

			const result = await service.getById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
		});

		it('should return error when report not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(
				Result.error(new HrReportNotFoundError(VALID_UUID))
			);

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('REPORT_NOT_FOUND');
		});

		it('should catch repository exceptions and return error result', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Connection failed'));

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Connection failed');
		});

		it('should call repository.findById with the provided id', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(testReport));

			await service.getById(VALID_UUID);

			expect(mockRepository.findById).toHaveBeenCalledWith(VALID_UUID);
		});
	});

	describe('getAll()', () => {
		it('should return all reports when no filter provided', async () => {
			const reports = [testReport];
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok(reports));

			const result = await service.getAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should pass filter to repository', async () => {
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok([]));
			const filter = { status: 'draft', reportType: 'headcount' };

			await service.getAll(filter);

			expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
		});

		it('should return empty array when no reports exist', async () => {
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok([]));

			const result = await service.getAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should catch repository exceptions and return error result', async () => {
			vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('DB timeout'));

			const result = await service.getAll();

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('DB timeout');
		});

		it('should call repository.findAll without filter when none provided', async () => {
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok([]));

			await service.getAll();

			expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
		});
	});

	describe('getByDepartment()', () => {
		it('should return reports for a department', async () => {
			vi.mocked(mockRepository.findByDepartment).mockResolvedValue(Result.ok([testReport]));

			const result = await service.getByDepartment(VALID_UUID_3);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should pass departmentId and filter to repository', async () => {
			vi.mocked(mockRepository.findByDepartment).mockResolvedValue(Result.ok([]));
			const filter = { status: 'completed' };

			await service.getByDepartment(VALID_UUID_3, filter);

			expect(mockRepository.findByDepartment).toHaveBeenCalledWith(VALID_UUID_3, filter);
		});

		it('should catch repository exceptions and return error result', async () => {
			vi.mocked(mockRepository.findByDepartment).mockRejectedValue(
				new Error('Network error')
			);

			const result = await service.getByDepartment(VALID_UUID_3);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Network error');
		});
	});

	describe('create()', () => {
		const createData = {
			creatorId: VALID_UUID_2,
			departmentId: VALID_UUID_3,
			title: 'New Report',
			reportType: 'headcount',
			category: 'operational'
		};

		it('should create a report successfully', async () => {
			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(testReport));

			const result = await service.create(createData);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(HrReport);
		});

		it('should pass create data to repository', async () => {
			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(testReport));

			await service.create(createData);

			expect(mockRepository.create).toHaveBeenCalledWith(createData);
		});

		it('should return error when creation fails', async () => {
			vi.mocked(mockRepository.create).mockResolvedValue(
				Result.error(new InvalidHrReportError('Missing required field'))
			);

			const result = await service.create(createData);

			expect(result.isError).toBe(true);
		});

		it('should catch repository exceptions and return error result', async () => {
			vi.mocked(mockRepository.create).mockRejectedValue(new Error('Constraint violation'));

			const result = await service.create(createData);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Constraint violation');
		});
	});

	describe('update()', () => {
		const updateData = { title: 'Updated Title', status: 'active' };

		it('should update a report successfully', async () => {
			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(testReport));

			const result = await service.update(VALID_UUID, updateData);

			expect(result.isOk).toBe(true);
		});

		it('should pass id and update data to repository', async () => {
			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(testReport));

			await service.update(VALID_UUID, updateData);

			expect(mockRepository.update).toHaveBeenCalledWith(VALID_UUID, updateData);
		});

		it('should return error when report not found', async () => {
			vi.mocked(mockRepository.update).mockResolvedValue(
				Result.error(new HrReportNotFoundError(VALID_UUID))
			);

			const result = await service.update(VALID_UUID, updateData);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('REPORT_NOT_FOUND');
		});

		it('should catch repository exceptions and return error result', async () => {
			vi.mocked(mockRepository.update).mockRejectedValue(new Error('Write failed'));

			const result = await service.update(VALID_UUID, updateData);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Write failed');
		});
	});

	describe('delete()', () => {
		it('should delete a report successfully', async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(Result.ok(undefined));

			const result = await service.delete(VALID_UUID);

			expect(result.isOk).toBe(true);
		});

		it('should pass id to repository', async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(Result.ok(undefined));

			await service.delete(VALID_UUID);

			expect(mockRepository.delete).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return error when report not found', async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(
				Result.error(new HrReportNotFoundError(VALID_UUID))
			);

			const result = await service.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('REPORT_NOT_FOUND');
		});

		it('should catch repository exceptions and return error result', async () => {
			vi.mocked(mockRepository.delete).mockRejectedValue(new Error('Deletion blocked'));

			const result = await service.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Deletion blocked');
		});
	});

	describe('generate()', () => {
		it('should trigger report generation successfully', async () => {
			const generatedReport = HrReport.create({
				id: VALID_UUID,
				creatorId: VALID_UUID_2,
				departmentId: VALID_UUID_3,
				title: ReportTitle.create('Monthly Headcount Report').value,
				reportType: ReportType.create('headcount').value,
				category: 'operational',
				status: ReportStatus.create('completed').value,
				filters: null,
				data: { totalCount: 42 },
				scheduledAt: null,
				generatedAt: new Date('2025-06-01T10:00:00.000Z'),
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2025-06-01T10:00:00.000Z')
			}).value;

			vi.mocked(mockRepository.generate).mockResolvedValue(Result.ok(generatedReport));

			const result = await service.generate(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value.isCompleted()).toBe(true);
		});

		it('should pass id to repository', async () => {
			vi.mocked(mockRepository.generate).mockResolvedValue(Result.ok(testReport));

			await service.generate(VALID_UUID);

			expect(mockRepository.generate).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return error when report not found for generation', async () => {
			vi.mocked(mockRepository.generate).mockResolvedValue(
				Result.error(new HrReportNotFoundError(VALID_UUID))
			);

			const result = await service.generate(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('REPORT_NOT_FOUND');
		});

		it('should catch repository exceptions and return error result', async () => {
			vi.mocked(mockRepository.generate).mockRejectedValue(new Error('Generation timeout'));

			const result = await service.generate(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Generation timeout');
		});
	});
});
