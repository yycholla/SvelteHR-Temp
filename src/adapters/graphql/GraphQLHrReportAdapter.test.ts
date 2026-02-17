import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLHrReportAdapter } from './GraphQLHrReportAdapter';
import { HrReport } from '$domain/HrReport/HrReport';
import {
	HrReportNotFoundError,
	InvalidHrReportError
} from '$domain/HrReport/errors/HrReportErrors';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

// --- Mock GraphQLPort ---

class MockGraphQLPort implements GraphQLPort {
	private mockData: Record<string, unknown> = {};
	private shouldThrow = false;

	setMockData(data: Record<string, unknown>) {
		this.mockData = data;
		this.shouldThrow = false;
	}

	setShouldThrow(shouldThrow: boolean) {
		this.shouldThrow = shouldThrow;
	}

	async query<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL query failed');
		}
		return this.mockData as T;
	}

	async mutation<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL mutation failed');
		}
		return this.mockData as T;
	}
}

// --- Helper data factories ---

const VALID_REPORT_ID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_CREATOR_ID = '123e4567-e89b-12d3-a456-426614174001';
const VALID_DEPT_ID = '123e4567-e89b-12d3-a456-426614174002';

function createGraphQLReport(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_REPORT_ID,
		creatorId: VALID_CREATOR_ID,
		departmentId: VALID_DEPT_ID,
		title: 'Monthly Headcount Report',
		reportType: 'headcount',
		category: 'operational',
		status: 'draft',
		filters: null,
		data: null,
		scheduledAt: null,
		generatedAt: null,
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2025-01-01T00:00:00.000Z',
		...overrides
	};
}

// --- Tests ---

describe('GraphQLHrReportAdapter', () => {
	let adapter: GraphQLHrReportAdapter;
	let mockGraphQL: MockGraphQLPort;

	beforeEach(() => {
		mockGraphQL = new MockGraphQLPort();
		adapter = new GraphQLHrReportAdapter(mockGraphQL);
	});

	// --- findById ---

	describe('findById()', () => {
		it('should return a report when found', async () => {
			mockGraphQL.setMockData({ hrReport: createGraphQLReport() });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(HrReport);
			expect(result.value.id).toBe(VALID_REPORT_ID);
		});

		it('should return HrReportNotFoundError when hrReport is null', async () => {
			mockGraphQL.setMockData({ hrReport: null });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(HrReportNotFoundError);
			expect(result.error.code).toBe('REPORT_NOT_FOUND');
		});

		it('should return HrReportNotFoundError when query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(HrReportNotFoundError);
		});

		it('should return HrReportNotFoundError for invalid report data (bad UUID)', async () => {
			mockGraphQL.setMockData({ hrReport: createGraphQLReport({ id: 'not-a-uuid' }) });

			const result = await adapter.findById('not-a-uuid');

			expect(result.isError).toBe(true);
		});

		it('should correctly map report title', async () => {
			mockGraphQL.setMockData({ hrReport: createGraphQLReport({ title: 'Q1 Turnover Report' }) });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Q1 Turnover Report');
		});

		it('should correctly map report type', async () => {
			mockGraphQL.setMockData({ hrReport: createGraphQLReport({ reportType: 'turnover' }) });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.reportType.value).toBe('turnover');
		});

		it('should correctly map report status', async () => {
			mockGraphQL.setMockData({ hrReport: createGraphQLReport({ status: 'completed' }) });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('completed');
		});

		it('should map null filters correctly', async () => {
			mockGraphQL.setMockData({ hrReport: createGraphQLReport({ filters: null }) });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.filters).toBeNull();
		});

		it('should map filters record correctly', async () => {
			const filters = { startDate: '2025-01-01', endDate: '2025-12-31' };
			mockGraphQL.setMockData({ hrReport: createGraphQLReport({ filters }) });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.filters).toEqual(filters);
		});

		it('should map scheduledAt date correctly', async () => {
			mockGraphQL.setMockData({
				hrReport: createGraphQLReport({ scheduledAt: '2025-06-01T10:00:00.000Z' })
			});

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.scheduledAt?.toISOString()).toBe('2025-06-01T10:00:00.000Z');
		});

		it('should handle null departmentId by using sentinel UUID', async () => {
			mockGraphQL.setMockData({ hrReport: createGraphQLReport({ departmentId: null }) });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.departmentId).toBe('00000000-0000-0000-0000-000000000000');
		});

		it('should return null for invalid report type', async () => {
			mockGraphQL.setMockData({
				hrReport: createGraphQLReport({ reportType: 'not_a_valid_type' })
			});

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
		});

		it('should return null for invalid status', async () => {
			mockGraphQL.setMockData({
				hrReport: createGraphQLReport({ status: 'invalid_status' })
			});

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
		});
	});

	// --- findAll ---

	describe('findAll()', () => {
		it('should return all reports', async () => {
			const reports = [
				createGraphQLReport(),
				createGraphQLReport({ id: '123e4567-e89b-12d3-a456-426614174099' })
			];
			mockGraphQL.setMockData({ hrReports: reports });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value[0]).toBeInstanceOf(HrReport);
		});

		it('should return empty array when no reports', async () => {
			mockGraphQL.setMockData({ hrReports: [] });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should skip invalid reports (resilient)', async () => {
			const reports = [
				createGraphQLReport(), // valid
				createGraphQLReport({ status: 'invalid_status' }), // invalid - skipped
				createGraphQLReport({ id: '123e4567-e89b-12d3-a456-426614174099' }) // valid
			];
			mockGraphQL.setMockData({ hrReports: reports });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return error when query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findAll();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidHrReportError);
		});

		it('should filter by status when provided', async () => {
			const reports = [
				createGraphQLReport({ status: 'draft' }),
				createGraphQLReport({
					id: '123e4567-e89b-12d3-a456-426614174099',
					status: 'completed'
				})
			];
			mockGraphQL.setMockData({ hrReports: reports });

			const result = await adapter.findAll({ status: 'draft' });

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].status.value).toBe('draft');
		});

		it('should filter by reportType when provided', async () => {
			const reports = [
				createGraphQLReport({ reportType: 'headcount' }),
				createGraphQLReport({
					id: '123e4567-e89b-12d3-a456-426614174099',
					reportType: 'turnover'
				})
			];
			mockGraphQL.setMockData({ hrReports: reports });

			const result = await adapter.findAll({ reportType: 'headcount' });

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].reportType.value).toBe('headcount');
		});

		it('should filter by creatorId when provided', async () => {
			const OTHER_CREATOR = '123e4567-e89b-12d3-a456-426614174099';
			const reports = [
				createGraphQLReport(),
				createGraphQLReport({
					id: '123e4567-e89b-12d3-a456-426614174088',
					creatorId: OTHER_CREATOR
				})
			];
			mockGraphQL.setMockData({ hrReports: reports });

			const result = await adapter.findAll({ creatorId: VALID_CREATOR_ID });

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});
	});

	// --- findByDepartment ---

	describe('findByDepartment()', () => {
		it('should return reports for a specific department', async () => {
			const OTHER_DEPT = '123e4567-e89b-12d3-a456-426614174099';
			const reports = [
				createGraphQLReport(),
				createGraphQLReport({
					id: '123e4567-e89b-12d3-a456-426614174088',
					departmentId: OTHER_DEPT
				})
			];
			mockGraphQL.setMockData({ hrReports: reports });

			const result = await adapter.findByDepartment(VALID_DEPT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].departmentId).toBe(VALID_DEPT_ID);
		});

		it('should return empty array when no reports for department', async () => {
			mockGraphQL.setMockData({ hrReports: [] });

			const result = await adapter.findByDepartment(VALID_DEPT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	// --- create ---

	describe('create()', () => {
		const createData = {
			creatorId: VALID_CREATOR_ID,
			departmentId: VALID_DEPT_ID,
			title: 'New Report',
			reportType: 'headcount',
			category: 'operational'
		};

		it('should create and return a report', async () => {
			mockGraphQL.setMockData({ createHrReport: createGraphQLReport() });

			const result = await adapter.create(createData);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(HrReport);
		});

		it('should return error when mutation returns null', async () => {
			mockGraphQL.setMockData({ createHrReport: null });

			const result = await adapter.create(createData);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidHrReportError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.create(createData);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidHrReportError);
			expect(result.error.message).toContain('Failed to create');
		});

		it('should return error for invalid response data', async () => {
			mockGraphQL.setMockData({ createHrReport: createGraphQLReport({ reportType: 'bad_type' }) });

			const result = await adapter.create(createData);

			expect(result.isError).toBe(true);
		});
	});

	// --- update ---

	describe('update()', () => {
		const updateData = { title: 'Updated Report Title', status: 'active' };

		it('should update and return a report', async () => {
			mockGraphQL.setMockData({
				updateHrReport: createGraphQLReport({ title: 'Updated Report Title', status: 'active' })
			});

			const result = await adapter.update(VALID_REPORT_ID, updateData);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(HrReport);
			expect(result.value.title.value).toBe('Updated Report Title');
		});

		it('should return HrReportNotFoundError when mutation returns null', async () => {
			mockGraphQL.setMockData({ updateHrReport: null });

			const result = await adapter.update(VALID_REPORT_ID, updateData);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(HrReportNotFoundError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.update(VALID_REPORT_ID, updateData);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidHrReportError);
			expect(result.error.message).toContain('Failed to update');
		});
	});

	// --- delete ---

	describe('delete()', () => {
		it('should delete a report successfully', async () => {
			mockGraphQL.setMockData({ deleteHrReport: true });

			const result = await adapter.delete(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
		});

		it('should return HrReportNotFoundError when mutation returns false', async () => {
			mockGraphQL.setMockData({ deleteHrReport: false });

			const result = await adapter.delete(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(HrReportNotFoundError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.delete(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(HrReportNotFoundError);
		});
	});

	// --- generate ---

	describe('generate()', () => {
		it('should generate and return an updated report', async () => {
			mockGraphQL.setMockData({
				updateHrReport: createGraphQLReport({ status: 'active' })
			});

			const result = await adapter.generate(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(HrReport);
		});

		it('should return HrReportNotFoundError when mutation returns null', async () => {
			mockGraphQL.setMockData({ updateHrReport: null });

			const result = await adapter.generate(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(HrReportNotFoundError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.generate(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidHrReportError);
			expect(result.error.message).toContain('Failed to generate');
		});

		it('should return error for invalid response data', async () => {
			mockGraphQL.setMockData({ updateHrReport: createGraphQLReport({ status: 'invalid' }) });

			const result = await adapter.generate(VALID_REPORT_ID);

			expect(result.isError).toBe(true);
		});
	});

	// --- mapToHrReport (private, tested via public methods) ---

	describe('mapToHrReport() resilience', () => {
		it('should handle null data without throwing', async () => {
			mockGraphQL.setMockData({ hrReport: null });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isError).toBe(true); // Resilient - null returns not-found error
		});

		it('should skip reports with empty title', async () => {
			const reports = [
				createGraphQLReport(),
				createGraphQLReport({ title: '' }) // invalid - skipped
			];
			mockGraphQL.setMockData({ hrReports: reports });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should handle reports with null category by defaulting to general', async () => {
			mockGraphQL.setMockData({ hrReport: createGraphQLReport({ category: null }) });

			const result = await adapter.findById(VALID_REPORT_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.category).toBe('general');
		});

		it('should handle reports with invalid createdAt date', async () => {
			const reports = [
				createGraphQLReport({ createdAt: 'not-a-date' }) // invalid date - skipped
			];
			mockGraphQL.setMockData({ hrReports: reports });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});
});
