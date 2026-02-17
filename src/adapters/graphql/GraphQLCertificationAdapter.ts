// src/adapters/graphql/GraphQLCertificationAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
import {
	Certification,
	CertificationName,
	IssuingOrganization,
	CredentialId,
	CertificationNotFoundError,
	InvalidCertificationError
} from '$domain/Certification';
import type { CertificationError } from '$domain/Certification';
import type { CertificationRepository } from '$services/ports/CertificationRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for certification
 */
interface GraphQLCertification {
	id: string;
	employeeId: string;
	name: string;
	issuingOrganization: string;
	issueDate: string;
	expirationDate: string | null;
	credentialId: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * GraphQLCertificationAdapter implements CertificationRepository port for GraphQL backend.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLCertificationAdapter(graphqlPort);
 * const result = await adapter.findByEmployeeId('employee-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // Certification[]
 * }
 * ```
 */
export class GraphQLCertificationAdapter implements CertificationRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<Certification | null, CertificationError>> {
		const query = gql`
			query GetCertification($id: UUID!) {
				certification(id: $id) {
					id
					employeeId
					name
					issuingOrganization
					issueDate
					expirationDate
					credentialId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				certification: GraphQLCertification | null;
			}>(query, { id });

			if (!result?.certification) {
				return Result.ok(null);
			}

			const cert = this.mapToEntity(result.certification);
			return Result.ok(cert);
		} catch {
			return Result.ok(null);
		}
	}

	async findByEmployeeId(employeeId: string): Promise<Result<Certification[], CertificationError>> {
		const query = gql`
			query GetCertificationsByEmployee($employeeId: UUID!) {
				certificationsByEmployee(employeeId: $employeeId) {
					id
					employeeId
					name
					issuingOrganization
					issueDate
					expirationDate
					credentialId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				certificationsByEmployee: GraphQLCertification[];
			}>(query, { employeeId });

			const certs = (result?.certificationsByEmployee ?? [])
				.map((c) => this.mapToEntity(c))
				.filter((c): c is Certification => c !== null);

			return Result.ok(certs);
		} catch (error) {
			return Result.error(
				new InvalidCertificationError(
					`Failed to fetch certifications: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findExpiring(beforeDate: Date): Promise<Result<Certification[], CertificationError>> {
		const query = gql`
			query GetExpiringCertifications($beforeDate: DateTime!) {
				expiringCertifications(beforeDate: $beforeDate) {
					id
					employeeId
					name
					issuingOrganization
					issueDate
					expirationDate
					credentialId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				expiringCertifications: GraphQLCertification[];
			}>(query, { beforeDate: beforeDate.toISOString() });

			const certs = (result?.expiringCertifications ?? [])
				.map((c) => this.mapToEntity(c))
				.filter((c): c is Certification => c !== null);

			return Result.ok(certs);
		} catch (error) {
			return Result.error(
				new InvalidCertificationError(
					`Failed to fetch expiring certifications: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(cert: Certification): Promise<Result<Certification, CertificationError>> {
		const mutation = gql`
			mutation CreateCertification($input: CreateCertificationInput!) {
				createCertification(input: $input) {
					id
					employeeId
					name
					issuingOrganization
					issueDate
					expirationDate
					credentialId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				id: cert.id,
				employeeId: cert.employeeId,
				name: cert.name.value,
				issuingOrganization: cert.issuingOrganization.value,
				issueDate: cert.issueDate.toISOString(),
				expirationDate: cert.expirationDate?.toISOString() ?? null,
				credentialId: cert.credentialId?.value ?? null
			};

			const result = await this.graphql.mutation<{
				createCertification: GraphQLCertification;
			}>(mutation, { input });

			if (!result?.createCertification) {
				return Result.error(new InvalidCertificationError('Failed to create certification'));
			}

			const created = this.mapToEntity(result.createCertification);
			if (!created) {
				return Result.error(
					new InvalidCertificationError('Invalid certification data returned from create')
				);
			}

			return Result.ok(created);
		} catch (error) {
			return Result.error(
				new InvalidCertificationError(
					`Failed to create certification: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(cert: Certification): Promise<Result<Certification, CertificationError>> {
		const mutation = gql`
			mutation UpdateCertification($id: UUID!, $input: UpdateCertificationInput!) {
				updateCertification(id: $id, input: $input) {
					id
					employeeId
					name
					issuingOrganization
					issueDate
					expirationDate
					credentialId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				name: cert.name.value,
				issuingOrganization: cert.issuingOrganization.value,
				issueDate: cert.issueDate.toISOString(),
				expirationDate: cert.expirationDate?.toISOString() ?? null,
				credentialId: cert.credentialId?.value ?? null
			};

			const result = await this.graphql.mutation<{
				updateCertification: GraphQLCertification;
			}>(mutation, { id: cert.id, input });

			if (!result?.updateCertification) {
				return Result.error(new InvalidCertificationError('Failed to update certification'));
			}

			const updated = this.mapToEntity(result.updateCertification);
			if (!updated) {
				return Result.error(
					new InvalidCertificationError('Invalid certification data returned from update')
				);
			}

			return Result.ok(updated);
		} catch (error) {
			return Result.error(
				new InvalidCertificationError(
					`Failed to update certification: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, CertificationError>> {
		const mutation = gql`
			mutation DeleteCertification($id: UUID!) {
				deleteCertification(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteCertification: boolean }>(mutation, {
				id
			});

			if (!result?.deleteCertification) {
				return Result.error(new CertificationNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new CertificationNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL certification data to domain Certification entity.
	 * @private
	 * @returns Certification entity or null if data is invalid (resilient error handling)
	 */
	private mapToEntity(data: GraphQLCertification): Certification | null {
		try {
			const nameResult = CertificationName.create(data.name);
			if (nameResult.isError) return null;

			const orgResult = IssuingOrganization.create(data.issuingOrganization);
			if (orgResult.isError) return null;

			const credResult = CredentialId.create(data.credentialId);
			if (credResult.isError) return null;

			const issueDate = new Date(data.issueDate);
			if (isNaN(issueDate.getTime())) return null;

			const expirationDate = data.expirationDate !== null ? new Date(data.expirationDate) : null;
			if (expirationDate !== null && isNaN(expirationDate.getTime())) return null;

			const createdAt = new Date(data.createdAt);
			const updatedAt = new Date(data.updatedAt);

			if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) return null;

			const certResult = Certification.create({
				id: data.id,
				employeeId: data.employeeId,
				name: nameResult.value,
				issuingOrganization: orgResult.value,
				issueDate,
				expirationDate,
				credentialId: credResult.value,
				createdAt,
				updatedAt
			});

			if (certResult.isError) return null;

			return certResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}
}
