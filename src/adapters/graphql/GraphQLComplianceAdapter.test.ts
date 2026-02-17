// src/adapters/graphql/GraphQLComplianceAdapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLComplianceAdapter } from './GraphQLComplianceAdapter';
import { ComplianceArea, ComplianceStatus } from '$domain/Compliance';
import { ComplianceAreaNotFoundError } from '$domain/Compliance';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

// Valid GraphQL response data shape
function createGraphQLArea(
	overrides: Partial<{
		id: string;
		name: string;
		description: string | null;
		score: number;
		status: string;
	}> = {}
) {
	return {
		id: overrides.id ?? 'area-uuid-001',
		name: overrides.name ?? 'Data Privacy (GDPR)',
		description: overrides.description !== undefined ? overrides.description : 'Test description',
		score: overrides.score ?? 85,
		status: overrides.status ?? 'compliant',
		lastReviewDate: '2026-01-01T00:00:00.000Z',
		nextReviewDate: '2099-12-31T00:00:00.000Z',
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z'
	};
}

function createMockGraphQLPort(): GraphQLPort {
	return {
		query: vi.fn(),
		mutation: vi.fn()
	};
}

describe('GraphQLComplianceAdapter', () => {
	let graphql: GraphQLPort;
	let adapter: GraphQLComplianceAdapter;

	beforeEach(() => {
		graphql = createMockGraphQLPort();
		adapter = new GraphQLComplianceAdapter(graphql);
	});

	describe('findById()', () => {
		it('should return a ComplianceArea when found', async () => {
			const gqlArea = createGraphQLArea();
			vi.mocked(graphql.query).mockResolvedValue({ complianceArea: gqlArea });

			const result = await adapter.findById('area-uuid-001');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(ComplianceArea);
			expect(result.value?.id).toBe('area-uuid-001');
		});

		it('should return null when area is not found', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ complianceArea: null });

			const result = await adapter.findById('non-existent');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null on GraphQL error (resilient)', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('GraphQL error'));

			const result = await adapter.findById('area-uuid-001');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when area has invalid score', async () => {
			const gqlArea = createGraphQLArea({ score: 200 }); // invalid
			vi.mocked(graphql.query).mockResolvedValue({ complianceArea: gqlArea });

			const result = await adapter.findById('area-uuid-001');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when area has invalid status', async () => {
			const gqlArea = createGraphQLArea({ status: 'invalid-status' });
			vi.mocked(graphql.query).mockResolvedValue({ complianceArea: gqlArea });

			const result = await adapter.findById('area-uuid-001');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should map area without description (null)', async () => {
			const gqlArea = createGraphQLArea({ description: null });
			vi.mocked(graphql.query).mockResolvedValue({ complianceArea: gqlArea });

			const result = await adapter.findById('area-uuid-001');

			expect(result.isOk).toBe(true);
			expect(result.value?.description).toBeUndefined();
		});
	});

	describe('findAll()', () => {
		it('should return all compliance areas', async () => {
			const gqlAreas = [
				createGraphQLArea({ id: 'area-1', name: 'Data Privacy (GDPR)' }),
				createGraphQLArea({ id: 'area-2', name: 'Employment Law' })
			];
			vi.mocked(graphql.query).mockResolvedValue({ complianceAreas: gqlAreas });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value[0]).toBeInstanceOf(ComplianceArea);
		});

		it('should return empty array when no areas exist', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ complianceAreas: [] });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should skip invalid areas (resilient mapping)', async () => {
			const gqlAreas = [
				createGraphQLArea({ id: 'area-1' }),
				createGraphQLArea({ id: 'area-2', score: 999 }), // invalid - should be skipped
				createGraphQLArea({ id: 'area-3' })
			];
			vi.mocked(graphql.query).mockResolvedValue({ complianceAreas: gqlAreas });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return error on GraphQL failure', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('Connection timeout'));

			const result = await adapter.findAll();

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Connection timeout');
		});

		it('should handle null complianceAreas gracefully', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ complianceAreas: null });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('findDueForReview()', () => {
		it('should return areas due for review', async () => {
			const gqlAreas = [createGraphQLArea({ id: 'area-overdue' })];
			vi.mocked(graphql.query).mockResolvedValue({
				complianceAreasDueForReview: gqlAreas
			});

			const result = await adapter.findDueForReview();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error on GraphQL failure', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('Server error'));

			const result = await adapter.findDueForReview();

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Server error');
		});
	});

	describe('findByStatus()', () => {
		it('should return areas with specified status', async () => {
			const gqlAreas = [createGraphQLArea({ status: 'warning' })];
			vi.mocked(graphql.query).mockResolvedValue({ complianceAreasByStatus: gqlAreas });

			const status = ComplianceStatus.create('warning').value;
			const result = await adapter.findByStatus(status);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should pass the status value to the query', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ complianceAreasByStatus: [] });

			const status = ComplianceStatus.create('failed').value;
			await adapter.findByStatus(status);

			expect(graphql.query).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ status: 'failed' })
			);
		});

		it('should return error on GraphQL failure', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('Network error'));

			const status = ComplianceStatus.create('compliant').value;
			const result = await adapter.findByStatus(status);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Network error');
		});
	});

	describe('create()', () => {
		it('should create a compliance area and return it', async () => {
			const gqlArea = createGraphQLArea();
			vi.mocked(graphql.mutation).mockResolvedValue({ createComplianceArea: gqlArea });

			const areaResult = ComplianceArea.create({
				id: 'area-uuid-001',
				name: 'Data Privacy (GDPR)',
				score: 85,
				status: 'compliant',
				lastReviewDate: new Date('2026-01-01T00:00:00.000Z'),
				nextReviewDate: new Date('2099-12-31T00:00:00.000Z'),
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2026-01-01T00:00:00.000Z')
			});
			const area = areaResult.value;

			const result = await adapter.create(area);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(ComplianceArea);
		});

		it('should return error when mutation returns empty response', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ createComplianceArea: null });

			const area = ComplianceArea.create({
				id: 'area-uuid-001',
				name: 'Data Privacy (GDPR)',
				score: 85,
				status: 'compliant',
				lastReviewDate: new Date('2026-01-01T00:00:00.000Z'),
				nextReviewDate: new Date('2099-12-31T00:00:00.000Z'),
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2026-01-01T00:00:00.000Z')
			}).value;

			const result = await adapter.create(area);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('empty response');
		});

		it('should return error on GraphQL failure', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Mutation failed'));

			const area = ComplianceArea.create({
				id: 'area-uuid-001',
				name: 'Employment Law',
				score: 75,
				status: 'compliant',
				lastReviewDate: new Date('2026-01-01T00:00:00.000Z'),
				nextReviewDate: new Date('2099-12-31T00:00:00.000Z'),
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2026-01-01T00:00:00.000Z')
			}).value;

			const result = await adapter.create(area);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Mutation failed');
		});
	});

	describe('update()', () => {
		it('should update a compliance area and return it', async () => {
			const gqlArea = createGraphQLArea({ score: 95 });
			vi.mocked(graphql.mutation).mockResolvedValue({ updateComplianceArea: gqlArea });

			const area = ComplianceArea.create({
				id: 'area-uuid-001',
				name: 'Data Privacy (GDPR)',
				score: 95,
				status: 'compliant',
				lastReviewDate: new Date('2026-01-01T00:00:00.000Z'),
				nextReviewDate: new Date('2099-12-31T00:00:00.000Z'),
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2026-01-01T00:00:00.000Z')
			}).value;

			const result = await adapter.update(area);

			expect(result.isOk).toBe(true);
			expect(result.value.score.value).toBe(95);
		});

		it('should return ComplianceAreaNotFoundError when mutation returns null', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ updateComplianceArea: null });

			const area = ComplianceArea.create({
				id: 'area-uuid-001',
				name: 'Data Privacy (GDPR)',
				score: 85,
				status: 'compliant',
				lastReviewDate: new Date('2026-01-01T00:00:00.000Z'),
				nextReviewDate: new Date('2099-12-31T00:00:00.000Z'),
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2026-01-01T00:00:00.000Z')
			}).value;

			const result = await adapter.update(area);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ComplianceAreaNotFoundError);
		});

		it('should return error on GraphQL failure', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Update failed'));

			const area = ComplianceArea.create({
				id: 'area-uuid-001',
				name: 'Health & Safety',
				score: 80,
				status: 'compliant',
				lastReviewDate: new Date('2026-01-01T00:00:00.000Z'),
				nextReviewDate: new Date('2099-12-31T00:00:00.000Z'),
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2026-01-01T00:00:00.000Z')
			}).value;

			const result = await adapter.update(area);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Update failed');
		});
	});

	describe('delete()', () => {
		it('should delete a compliance area successfully', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ deleteComplianceArea: true });

			const result = await adapter.delete('area-uuid-001');

			expect(result.isOk).toBe(true);
		});

		it('should return ComplianceAreaNotFoundError when mutation returns false', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ deleteComplianceArea: false });

			const result = await adapter.delete('area-uuid-001');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ComplianceAreaNotFoundError);
		});

		it('should return ComplianceAreaNotFoundError on GraphQL failure', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Delete failed'));

			const result = await adapter.delete('area-uuid-001');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ComplianceAreaNotFoundError);
		});
	});

	describe('mapToEntity() (via findById)', () => {
		it('should correctly map all status values', async () => {
			const statuses = ['compliant', 'warning', 'failed', 'pending'];

			for (const status of statuses) {
				const gqlArea = createGraphQLArea({ id: `area-${status}`, status });
				vi.mocked(graphql.query).mockResolvedValue({ complianceArea: gqlArea });

				const result = await adapter.findById(`area-${status}`);

				expect(result.isOk).toBe(true);
				expect(result.value?.status.value).toBe(status);
			}
		});

		it('should correctly set score value', async () => {
			const gqlArea = createGraphQLArea({ score: 73 });
			vi.mocked(graphql.query).mockResolvedValue({ complianceArea: gqlArea });

			const result = await adapter.findById('area-uuid-001');

			expect(result.isOk).toBe(true);
			expect(result.value?.score.value).toBe(73);
		});
	});
});
