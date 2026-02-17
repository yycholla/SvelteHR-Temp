import { describe, it, expect } from 'vitest';
import { HrReport } from './HrReport';
import { ReportTitle } from './value-objects/ReportTitle';
import { ReportType } from './value-objects/ReportType';
import { ReportStatus } from './value-objects/ReportStatus';

// --- Test constants ---

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '550e8400-e29b-41d4-a716-446655440001';
const VALID_UUID_3 = '550e8400-e29b-41d4-a716-446655440002';

// --- Helpers ---

function makeValidData(overrides: Partial<{
	id: string;
	creatorId: string;
	departmentId: string;
	title: ReturnType<typeof ReportTitle.create>['value'];
	reportType: ReturnType<typeof ReportType.create>['value'];
	category: string;
	status: ReturnType<typeof ReportStatus.create>['value'];
	filters: Record<string, unknown> | null;
	data: Record<string, unknown> | null;
	scheduledAt: Date | null;
	generatedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}> = {}) {
	return {
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
		updatedAt: new Date('2025-01-01T00:00:00.000Z'),
		...overrides
	};
}

function createValidReport(overrides = {}) {
	return HrReport.create(makeValidData(overrides));
}

// --- Tests ---

describe('HrReport', () => {
	describe('create()', () => {
		describe('valid reports', () => {
			it('should create a valid HrReport', () => {
				const result = createValidReport();
				expect(result.isOk).toBe(true);
			});

			it('should store the id correctly', () => {
				const result = createValidReport();
				expect(result.value.id).toBe(VALID_UUID);
			});

			it('should store the creatorId correctly', () => {
				const result = createValidReport();
				expect(result.value.creatorId).toBe(VALID_UUID_2);
			});

			it('should store the departmentId correctly', () => {
				const result = createValidReport();
				expect(result.value.departmentId).toBe(VALID_UUID_3);
			});

			it('should store the title correctly', () => {
				const result = createValidReport();
				expect(result.value.title.value).toBe('Monthly Headcount Report');
			});

			it('should store the reportType correctly', () => {
				const result = createValidReport();
				expect(result.value.reportType.value).toBe('headcount');
			});

			it('should store the category correctly', () => {
				const result = createValidReport();
				expect(result.value.category).toBe('operational');
			});

			it('should trim category whitespace', () => {
				const result = createValidReport({ category: '  compliance  ' });
				expect(result.isOk).toBe(true);
				expect(result.value.category).toBe('compliance');
			});

			it('should store null filters correctly', () => {
				const result = createValidReport({ filters: null });
				expect(result.value.filters).toBeNull();
			});

			it('should store filters record correctly', () => {
				const filters = { startDate: '2025-01-01', endDate: '2025-12-31' };
				const result = createValidReport({ filters });
				expect(result.value.filters).toEqual(filters);
			});

			it('should store null data correctly', () => {
				const result = createValidReport({ data: null });
				expect(result.value.data).toBeNull();
			});

			it('should store data record correctly', () => {
				const reportData = { totalCount: 100, departments: ['HR', 'Engineering'] };
				const result = createValidReport({ data: reportData });
				expect(result.value.data).toEqual(reportData);
			});

			it('should store null scheduledAt correctly', () => {
				const result = createValidReport({ scheduledAt: null });
				expect(result.value.scheduledAt).toBeNull();
			});

			it('should store scheduledAt with defensive copy', () => {
				const scheduledAt = new Date('2025-06-01T10:00:00.000Z');
				const result = createValidReport({ scheduledAt });
				expect(result.value.scheduledAt).not.toBe(scheduledAt);
				expect(result.value.scheduledAt?.getTime()).toBe(scheduledAt.getTime());
			});

			it('should store generatedAt with defensive copy', () => {
				const generatedAt = new Date('2025-06-02T10:00:00.000Z');
				const result = createValidReport({ generatedAt });
				expect(result.value.generatedAt).not.toBe(generatedAt);
				expect(result.value.generatedAt?.getTime()).toBe(generatedAt.getTime());
			});

			it('should store createdAt with defensive copy', () => {
				const createdAt = new Date('2025-01-01T00:00:00.000Z');
				const result = createValidReport({ createdAt });
				expect(result.value.createdAt).not.toBe(createdAt);
				expect(result.value.createdAt.getTime()).toBe(createdAt.getTime());
			});

			it('should store updatedAt with defensive copy', () => {
				const updatedAt = new Date('2025-01-02T00:00:00.000Z');
				const result = createValidReport({ updatedAt });
				expect(result.value.updatedAt).not.toBe(updatedAt);
				expect(result.value.updatedAt.getTime()).toBe(updatedAt.getTime());
			});

			it('should return defensive copy from scheduledAt getter', () => {
				const scheduledAt = new Date('2025-06-01T10:00:00.000Z');
				const report = createValidReport({ scheduledAt }).value;
				const got1 = report.scheduledAt;
				const got2 = report.scheduledAt;
				expect(got1).not.toBe(got2);
				expect(got1?.getTime()).toBe(got2?.getTime());
			});

			it('should return defensive copy from createdAt getter', () => {
				const report = createValidReport().value;
				const got1 = report.createdAt;
				const got2 = report.createdAt;
				expect(got1).not.toBe(got2);
				expect(got1.getTime()).toBe(got2.getTime());
			});
		});

		describe('invalid data', () => {
			it('should reject invalid id format', () => {
				const result = createValidReport({ id: 'not-a-uuid' });
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
				expect(result.error.message).toContain('ID');
			});

			it('should reject empty id', () => {
				const result = createValidReport({ id: '' });
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
			});

			it('should reject invalid creatorId format', () => {
				const result = createValidReport({ creatorId: 'bad-uuid' });
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('creator');
			});

			it('should reject invalid departmentId format', () => {
				const result = createValidReport({ departmentId: 'not-valid' });
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('department');
			});

			it('should reject empty category', () => {
				const result = createValidReport({ category: '' });
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('category');
			});

			it('should reject whitespace-only category', () => {
				const result = createValidReport({ category: '   ' });
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('category');
			});

			it('should reject category exceeding 100 characters', () => {
				const result = createValidReport({ category: 'C'.repeat(101) });
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('100');
			});
		});
	});

	describe('isCompleted()', () => {
		it('should return true when status is completed', () => {
			const report = createValidReport({
				status: ReportStatus.create('completed').value
			}).value;
			expect(report.isCompleted()).toBe(true);
		});

		it('should return false when status is draft', () => {
			const report = createValidReport().value;
			expect(report.isCompleted()).toBe(false);
		});

		it('should return false when status is failed', () => {
			const report = createValidReport({
				status: ReportStatus.create('failed').value
			}).value;
			expect(report.isCompleted()).toBe(false);
		});
	});

	describe('isFailed()', () => {
		it('should return true when status is failed', () => {
			const report = createValidReport({
				status: ReportStatus.create('failed').value
			}).value;
			expect(report.isFailed()).toBe(true);
		});

		it('should return false when status is draft', () => {
			const report = createValidReport().value;
			expect(report.isFailed()).toBe(false);
		});

		it('should return false when status is completed', () => {
			const report = createValidReport({
				status: ReportStatus.create('completed').value
			}).value;
			expect(report.isFailed()).toBe(false);
		});
	});

	describe('isScheduled()', () => {
		it('should return true when status is scheduled', () => {
			const report = createValidReport({
				status: ReportStatus.create('scheduled').value
			}).value;
			expect(report.isScheduled()).toBe(true);
		});

		it('should return false when status is draft', () => {
			const report = createValidReport().value;
			expect(report.isScheduled()).toBe(false);
		});

		it('should return false when status is completed', () => {
			const report = createValidReport({
				status: ReportStatus.create('completed').value
			}).value;
			expect(report.isScheduled()).toBe(false);
		});
	});

	describe('canBeDeleted()', () => {
		it('should return true for draft status', () => {
			const report = createValidReport({
				status: ReportStatus.create('draft').value
			}).value;
			expect(report.canBeDeleted()).toBe(true);
		});

		it('should return true for failed status', () => {
			const report = createValidReport({
				status: ReportStatus.create('failed').value
			}).value;
			expect(report.canBeDeleted()).toBe(true);
		});

		it('should return false for active status', () => {
			const report = createValidReport({
				status: ReportStatus.create('active').value
			}).value;
			expect(report.canBeDeleted()).toBe(false);
		});

		it('should return false for scheduled status', () => {
			const report = createValidReport({
				status: ReportStatus.create('scheduled').value
			}).value;
			expect(report.canBeDeleted()).toBe(false);
		});

		it('should return false for completed status', () => {
			const report = createValidReport({
				status: ReportStatus.create('completed').value
			}).value;
			expect(report.canBeDeleted()).toBe(false);
		});
	});
});
