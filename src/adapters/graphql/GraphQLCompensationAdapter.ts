// src/adapters/graphql/GraphQLCompensationAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
import {
	CompensationRecord,
	Salary,
	SalaryGrade,
	CompensationType,
	PaymentFrequency,
	EffectiveDate,
	CompensationNotFoundError,
	InvalidCompensationError
} from '$domain/Compensation';
import type {
	CompensationRepository,
	CreateCompensationData,
	UpdateCompensationData,
	CompensationFilter
} from '$services/ports/CompensationRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for compensation records
 */
interface GraphQLCompensation {
	id: string;
	employeeId: string;
	salary: number;
	currency: string;
	salaryGrade: string;
	compensationType: string;
	paymentFrequency: string;
	effectiveDate: string; // ISO date string
	endDate?: string | null; // ISO date string
	notes?: string | null;
}

/**
 * GraphQLCompensationAdapter implements CompensationRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLCompensationAdapter(graphqlPort);
 * const result = await adapter.findById('comp-123');
 * if (result.isOk) {
 *   console.log(result.value.salary.amount);
 * }
 * ```
 */
export class GraphQLCompensationAdapter implements CompensationRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<CompensationRecord, CompensationNotFoundError>> {
		const query = gql`
			query GetCompensation($id: UUID!) {
				compensation(id: $id) {
					id
					employeeId
					salary
					currency
					salaryGrade
					compensationType
					paymentFrequency
					effectiveDate
					endDate
					notes
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ compensation: GraphQLCompensation | null }>(query, {
				id
			});

			if (!result?.compensation) {
				return Result.error(new CompensationNotFoundError(id));
			}

			const compensation = this.mapToCompensationRecord(result.compensation);
			if (!compensation) {
				return Result.error(new CompensationNotFoundError(id));
			}

			return Result.ok(compensation);
		} catch (error) {
			return Result.error(new CompensationNotFoundError(id));
		}
	}

	async findByEmployeeId(
		employeeId: string
	): Promise<Result<CompensationRecord[], InvalidCompensationError>> {
		const query = gql`
			query GetCompensationsByEmployee($employeeId: UUID!) {
				compensationsByEmployee(employeeId: $employeeId) {
					id
					employeeId
					salary
					currency
					salaryGrade
					compensationType
					paymentFrequency
					effectiveDate
					endDate
					notes
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				compensationsByEmployee: GraphQLCompensation[];
			}>(query, { employeeId });

			const compensations = (result?.compensationsByEmployee ?? [])
				.map((c) => this.mapToCompensationRecord(c))
				.filter((c): c is CompensationRecord => c !== null);

			return Result.ok(compensations);
		} catch (error) {
			return Result.error(
				new InvalidCompensationError(
					`Failed to fetch compensations for employee: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findActiveByEmployeeId(
		employeeId: string
	): Promise<Result<CompensationRecord | null, InvalidCompensationError>> {
		const query = gql`
			query GetActiveCompensation($employeeId: UUID!) {
				activeCompensation(employeeId: $employeeId) {
					id
					employeeId
					salary
					currency
					salaryGrade
					compensationType
					paymentFrequency
					effectiveDate
					endDate
					notes
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				activeCompensation: GraphQLCompensation | null;
			}>(query, { employeeId });

			if (!result?.activeCompensation) {
				return Result.ok(null);
			}

			const compensation = this.mapToCompensationRecord(result.activeCompensation);
			return Result.ok(compensation);
		} catch (error) {
			return Result.error(
				new InvalidCompensationError(
					`Failed to fetch active compensation: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findAll(
		filter?: CompensationFilter
	): Promise<Result<CompensationRecord[], InvalidCompensationError>> {
		const query = gql`
			query GetCompensations(
				$employeeId: UUID
				$salaryGrade: String
				$compensationType: String
				$paymentFrequency: String
				$isActive: Boolean
				$effectiveDateFrom: DateTime
				$effectiveDateTo: DateTime
				$limit: Int
				$offset: Int
			) {
				compensations(
					employeeId: $employeeId
					salaryGrade: $salaryGrade
					compensationType: $compensationType
					paymentFrequency: $paymentFrequency
					isActive: $isActive
					effectiveDateFrom: $effectiveDateFrom
					effectiveDateTo: $effectiveDateTo
					limit: $limit
					offset: $offset
				) {
					id
					employeeId
					salary
					currency
					salaryGrade
					compensationType
					paymentFrequency
					effectiveDate
					endDate
					notes
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ compensations: GraphQLCompensation[] }>(
				query,
				filter ?? {}
			);

			const compensations = (result?.compensations ?? [])
				.map((c) => this.mapToCompensationRecord(c))
				.filter((c): c is CompensationRecord => c !== null);

			return Result.ok(compensations);
		} catch (error) {
			return Result.error(
				new InvalidCompensationError(
					`Failed to fetch compensations: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(
		data: CreateCompensationData
	): Promise<Result<CompensationRecord, InvalidCompensationError>> {
		const mutation = gql`
			mutation CreateCompensation($input: CreateCompensationInput!) {
				createCompensation(input: $input) {
					id
					employeeId
					salary
					currency
					salaryGrade
					compensationType
					paymentFrequency
					effectiveDate
					endDate
					notes
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				createCompensation: GraphQLCompensation;
			}>(mutation, { input: data });

			if (!result?.createCompensation) {
				return Result.error(new InvalidCompensationError('Failed to create compensation record'));
			}

			const compensation = this.mapToCompensationRecord(result.createCompensation);
			if (!compensation) {
				return Result.error(new InvalidCompensationError('Invalid compensation data returned'));
			}

			return Result.ok(compensation);
		} catch (error) {
			return Result.error(
				new InvalidCompensationError(
					`Failed to create compensation: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(
		id: string,
		data: UpdateCompensationData
	): Promise<Result<CompensationRecord, CompensationNotFoundError | InvalidCompensationError>> {
		const mutation = gql`
			mutation UpdateCompensation($id: UUID!, $input: UpdateCompensationInput!) {
				updateCompensation(id: $id, input: $input) {
					id
					employeeId
					salary
					currency
					salaryGrade
					compensationType
					paymentFrequency
					effectiveDate
					endDate
					notes
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				updateCompensation: GraphQLCompensation;
			}>(mutation, { id, input: data });

			if (!result?.updateCompensation) {
				return Result.error(new CompensationNotFoundError(id));
			}

			const compensation = this.mapToCompensationRecord(result.updateCompensation);
			if (!compensation) {
				return Result.error(new InvalidCompensationError('Invalid compensation data returned'));
			}

			return Result.ok(compensation);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			if (errorMsg.toLowerCase().includes('not found')) {
				return Result.error(new CompensationNotFoundError(id));
			}
			return Result.error(
				new InvalidCompensationError(`Failed to update compensation: ${errorMsg}`)
			);
		}
	}

	async terminate(
		id: string,
		endDate: string
	): Promise<Result<CompensationRecord, CompensationNotFoundError | InvalidCompensationError>> {
		const mutation = gql`
			mutation TerminateCompensation($id: UUID!, $endDate: DateTime!) {
				terminateCompensation(id: $id, endDate: $endDate) {
					id
					employeeId
					salary
					currency
					salaryGrade
					compensationType
					paymentFrequency
					effectiveDate
					endDate
					notes
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				terminateCompensation: GraphQLCompensation;
			}>(mutation, { id, endDate });

			if (!result?.terminateCompensation) {
				return Result.error(new CompensationNotFoundError(id));
			}

			const compensation = this.mapToCompensationRecord(result.terminateCompensation);
			if (!compensation) {
				return Result.error(new InvalidCompensationError('Invalid compensation data returned'));
			}

			return Result.ok(compensation);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			if (errorMsg.toLowerCase().includes('not found')) {
				return Result.error(new CompensationNotFoundError(id));
			}
			return Result.error(
				new InvalidCompensationError(`Failed to terminate compensation: ${errorMsg}`)
			);
		}
	}

	async delete(id: string): Promise<Result<void, CompensationNotFoundError>> {
		const mutation = gql`
			mutation DeleteCompensation($id: UUID!) {
				deleteCompensation(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteCompensation: boolean }>(mutation, {
				id
			});

			if (!result?.deleteCompensation) {
				return Result.error(new CompensationNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new CompensationNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL compensation data to domain CompensationRecord entity
	 * @private
	 * @returns CompensationRecord entity or null if data is invalid (resilient error handling)
	 */
	private mapToCompensationRecord(data: GraphQLCompensation): CompensationRecord | null {
		try {
			// Create value objects with validation
			const salaryResult = Salary.create(data.salary, data.currency);
			if (salaryResult.isError) return null;

			const gradeResult = SalaryGrade.create(data.salaryGrade);
			if (gradeResult.isError) return null;

			const typeResult = CompensationType.create(data.compensationType);
			if (typeResult.isError) return null;

			const frequencyResult = PaymentFrequency.create(data.paymentFrequency);
			if (frequencyResult.isError) return null;

			const effectiveDateResult = EffectiveDate.create(new Date(data.effectiveDate));
			if (effectiveDateResult.isError) return null;

			let endDate: EffectiveDate | null = null;
			if (data.endDate) {
				const endDateResult = EffectiveDate.create(new Date(data.endDate));
				if (endDateResult.isError) return null;
				endDate = endDateResult.value;
			}

			// Create entity
			const compensationResult = CompensationRecord.create({
				id: data.id,
				employeeId: data.employeeId,
				salary: salaryResult.value,
				salaryGrade: gradeResult.value,
				compensationType: typeResult.value,
				paymentFrequency: frequencyResult.value,
				effectiveDate: effectiveDateResult.value,
				endDate,
				notes: data.notes ?? null
			});

			if (compensationResult.isError) return null;

			return compensationResult.value;
		} catch (error) {
			return null; // Resilient - return null for invalid data
		}
	}
}
