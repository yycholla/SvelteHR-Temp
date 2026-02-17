// src/adapters/graphql/GraphQLComplianceAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
import {
	ComplianceArea,
	ComplianceStatus,
	ComplianceError,
	InvalidComplianceError,
	ComplianceAreaNotFoundError
} from '$domain/Compliance';
import type { ComplianceRepository } from '$services/ports/ComplianceRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for compliance area data
 */
interface GraphQLComplianceArea {
	id: string;
	name: string;
	description: string | null;
	score: number;
	status: string;
	lastReviewDate: string;
	nextReviewDate: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * GraphQLComplianceAdapter implements ComplianceRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data via mapToEntity returning null)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLComplianceAdapter(graphqlPort);
 * const result = await adapter.findAll();
 * if (result.isOk) {
 *   const areas = result.value;
 * }
 * ```
 */
export class GraphQLComplianceAdapter implements ComplianceRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<ComplianceArea | null, ComplianceError>> {
		const query = gql`
			query GetComplianceArea($id: UUID!) {
				complianceArea(id: $id) {
					id
					name
					description
					score
					status
					lastReviewDate
					nextReviewDate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ complianceArea: GraphQLComplianceArea | null }>(
				query,
				{ id }
			);

			if (!result?.complianceArea) {
				return Result.ok(null);
			}

			const area = this.mapToEntity(result.complianceArea);
			return Result.ok(area);
		} catch (error) {
			return Result.ok(null);
		}
	}

	async findAll(): Promise<Result<ComplianceArea[], ComplianceError>> {
		const query = gql`
			query GetAllComplianceAreas {
				complianceAreas {
					id
					name
					description
					score
					status
					lastReviewDate
					nextReviewDate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ complianceAreas: GraphQLComplianceArea[] }>(query);

			const areas = (result?.complianceAreas ?? [])
				.map((a) => this.mapToEntity(a))
				.filter((a): a is ComplianceArea => a !== null);

			return Result.ok(areas);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to fetch compliance areas: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findDueForReview(): Promise<Result<ComplianceArea[], ComplianceError>> {
		const query = gql`
			query GetComplianceAreasDueForReview {
				complianceAreasDueForReview {
					id
					name
					description
					score
					status
					lastReviewDate
					nextReviewDate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				complianceAreasDueForReview: GraphQLComplianceArea[];
			}>(query);

			const areas = (result?.complianceAreasDueForReview ?? [])
				.map((a) => this.mapToEntity(a))
				.filter((a): a is ComplianceArea => a !== null);

			return Result.ok(areas);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to fetch compliance areas due for review: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findByStatus(status: ComplianceStatus): Promise<Result<ComplianceArea[], ComplianceError>> {
		const query = gql`
			query GetComplianceAreasByStatus($status: String!) {
				complianceAreasByStatus(status: $status) {
					id
					name
					description
					score
					status
					lastReviewDate
					nextReviewDate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				complianceAreasByStatus: GraphQLComplianceArea[];
			}>(query, { status: status.value });

			const areas = (result?.complianceAreasByStatus ?? [])
				.map((a) => this.mapToEntity(a))
				.filter((a): a is ComplianceArea => a !== null);

			return Result.ok(areas);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to fetch compliance areas by status: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(area: ComplianceArea): Promise<Result<ComplianceArea, ComplianceError>> {
		const mutation = gql`
			mutation CreateComplianceArea($input: ComplianceAreaInput!) {
				createComplianceArea(input: $input) {
					id
					name
					description
					score
					status
					lastReviewDate
					nextReviewDate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = this.toGraphQLInput(area);
			const result = await this.graphql.mutation<{
				createComplianceArea: GraphQLComplianceArea;
			}>(mutation, { input });

			if (!result?.createComplianceArea) {
				return Result.error(
					new InvalidComplianceError('Failed to create compliance area: empty response')
				);
			}

			const created = this.mapToEntity(result.createComplianceArea);
			if (!created) {
				return Result.error(
					new InvalidComplianceError('Invalid compliance area data returned from create')
				);
			}

			return Result.ok(created);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to create compliance area: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(area: ComplianceArea): Promise<Result<ComplianceArea, ComplianceError>> {
		const mutation = gql`
			mutation UpdateComplianceArea($id: UUID!, $input: ComplianceAreaInput!) {
				updateComplianceArea(id: $id, input: $input) {
					id
					name
					description
					score
					status
					lastReviewDate
					nextReviewDate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = this.toGraphQLInput(area);
			const result = await this.graphql.mutation<{
				updateComplianceArea: GraphQLComplianceArea;
			}>(mutation, { id: area.id, input });

			if (!result?.updateComplianceArea) {
				return Result.error(new ComplianceAreaNotFoundError(area.id));
			}

			const updated = this.mapToEntity(result.updateComplianceArea);
			if (!updated) {
				return Result.error(
					new InvalidComplianceError('Invalid compliance area data returned from update')
				);
			}

			return Result.ok(updated);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to update compliance area: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, ComplianceError>> {
		const mutation = gql`
			mutation DeleteComplianceArea($id: UUID!) {
				deleteComplianceArea(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteComplianceArea: boolean }>(mutation, {
				id
			});

			if (!result?.deleteComplianceArea) {
				return Result.error(new ComplianceAreaNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new ComplianceAreaNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL compliance area data to domain ComplianceArea entity.
	 * Returns null if the data is invalid (resilient error handling).
	 *
	 * @private
	 */
	private mapToEntity(data: GraphQLComplianceArea): ComplianceArea | null {
		try {
			const result = ComplianceArea.create({
				id: data.id,
				name: data.name,
				description: data.description ?? undefined,
				score: data.score,
				status: data.status,
				lastReviewDate: new Date(data.lastReviewDate),
				nextReviewDate: new Date(data.nextReviewDate),
				createdAt: new Date(data.createdAt),
				updatedAt: new Date(data.updatedAt)
			});

			if (result.isError) return null;

			return result.value;
		} catch (error) {
			return null; // Resilient - return null for invalid data
		}
	}

	/**
	 * Convert a ComplianceArea entity to GraphQL input shape.
	 *
	 * @private
	 */
	private toGraphQLInput(area: ComplianceArea): Record<string, unknown> {
		return {
			name: area.name.value,
			description: area.description ?? null,
			score: area.score.value,
			status: area.status.value,
			lastReviewDate: area.lastReviewDate.value.toISOString(),
			nextReviewDate: area.nextReviewDate.value.toISOString()
		};
	}
}
