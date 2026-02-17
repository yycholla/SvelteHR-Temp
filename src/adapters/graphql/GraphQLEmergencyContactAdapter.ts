// src/adapters/graphql/GraphQLEmergencyContactAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
import {
	EmergencyContact,
	ContactName,
	ContactPhone,
	Relationship,
	EmergencyContactNotFoundError
} from '$domain/EmergencyContact';
import type { EmergencyContactError } from '$domain/EmergencyContact';
import { InvalidEmergencyContactError } from '$domain/EmergencyContact';
import type { EmergencyContactRepository } from '$services/ports/EmergencyContactRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for emergency contact
 */
interface GraphQLEmergencyContact {
	id: string;
	employeeId: string;
	name: string;
	phone: string;
	relationship: string;
	isPrimary: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * GraphQLEmergencyContactAdapter implements EmergencyContactRepository port for GraphQL backend.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLEmergencyContactAdapter(graphqlPort);
 * const result = await adapter.findByEmployeeId('employee-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // EmergencyContact[]
 * }
 * ```
 */
export class GraphQLEmergencyContactAdapter implements EmergencyContactRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<EmergencyContact | null, EmergencyContactError>> {
		const query = gql`
			query GetEmergencyContact($id: UUID!) {
				emergencyContact(id: $id) {
					id
					employeeId
					name
					phone
					relationship
					isPrimary
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				emergencyContact: GraphQLEmergencyContact | null;
			}>(query, { id });

			if (!result?.emergencyContact) {
				return Result.ok(null);
			}

			const contact = this.mapToEntity(result.emergencyContact);
			return Result.ok(contact);
		} catch {
			return Result.ok(null);
		}
	}

	async findByEmployeeId(
		employeeId: string
	): Promise<Result<EmergencyContact[], EmergencyContactError>> {
		const query = gql`
			query GetEmergencyContactsByEmployee($employeeId: UUID!) {
				emergencyContactsByEmployee(employeeId: $employeeId) {
					id
					employeeId
					name
					phone
					relationship
					isPrimary
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				emergencyContactsByEmployee: GraphQLEmergencyContact[];
			}>(query, { employeeId });

			const contacts = (result?.emergencyContactsByEmployee ?? [])
				.map((c) => this.mapToEntity(c))
				.filter((c): c is EmergencyContact => c !== null);

			return Result.ok(contacts);
		} catch (error) {
			return Result.error(
				new InvalidEmergencyContactError(
					`Failed to fetch emergency contacts: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findPrimaryByEmployeeId(
		employeeId: string
	): Promise<Result<EmergencyContact | null, EmergencyContactError>> {
		const query = gql`
			query GetPrimaryEmergencyContact($employeeId: UUID!) {
				primaryEmergencyContact(employeeId: $employeeId) {
					id
					employeeId
					name
					phone
					relationship
					isPrimary
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				primaryEmergencyContact: GraphQLEmergencyContact | null;
			}>(query, { employeeId });

			if (!result?.primaryEmergencyContact) {
				return Result.ok(null);
			}

			const contact = this.mapToEntity(result.primaryEmergencyContact);
			return Result.ok(contact);
		} catch {
			return Result.ok(null);
		}
	}

	async create(
		contact: EmergencyContact
	): Promise<Result<EmergencyContact, EmergencyContactError>> {
		const mutation = gql`
			mutation CreateEmergencyContact($input: CreateEmergencyContactInput!) {
				createEmergencyContact(input: $input) {
					id
					employeeId
					name
					phone
					relationship
					isPrimary
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				id: contact.id,
				employeeId: contact.employeeId,
				name: contact.name.value,
				phone: contact.phone.value,
				relationship: contact.relationship.value,
				isPrimary: contact.isPrimary
			};

			const result = await this.graphql.mutation<{
				createEmergencyContact: GraphQLEmergencyContact;
			}>(mutation, { input });

			if (!result?.createEmergencyContact) {
				return Result.error(
					new InvalidEmergencyContactError('Failed to create emergency contact')
				);
			}

			const created = this.mapToEntity(result.createEmergencyContact);
			if (!created) {
				return Result.error(
					new InvalidEmergencyContactError('Invalid emergency contact data returned from create')
				);
			}

			return Result.ok(created);
		} catch (error) {
			return Result.error(
				new InvalidEmergencyContactError(
					`Failed to create emergency contact: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(
		contact: EmergencyContact
	): Promise<Result<EmergencyContact, EmergencyContactError>> {
		const mutation = gql`
			mutation UpdateEmergencyContact($id: UUID!, $input: UpdateEmergencyContactInput!) {
				updateEmergencyContact(id: $id, input: $input) {
					id
					employeeId
					name
					phone
					relationship
					isPrimary
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				name: contact.name.value,
				phone: contact.phone.value
			};

			const result = await this.graphql.mutation<{
				updateEmergencyContact: GraphQLEmergencyContact;
			}>(mutation, { id: contact.id, input });

			if (!result?.updateEmergencyContact) {
				return Result.error(
					new InvalidEmergencyContactError('Failed to update emergency contact')
				);
			}

			const updated = this.mapToEntity(result.updateEmergencyContact);
			if (!updated) {
				return Result.error(
					new InvalidEmergencyContactError('Invalid emergency contact data returned from update')
				);
			}

			return Result.ok(updated);
		} catch (error) {
			return Result.error(
				new InvalidEmergencyContactError(
					`Failed to update emergency contact: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, EmergencyContactError>> {
		const mutation = gql`
			mutation DeleteEmergencyContact($id: UUID!) {
				deleteEmergencyContact(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteEmergencyContact: boolean }>(mutation, {
				id
			});

			if (!result?.deleteEmergencyContact) {
				return Result.error(new EmergencyContactNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new EmergencyContactNotFoundError(id));
		}
	}

	async setPrimary(
		id: string,
		employeeId: string
	): Promise<Result<EmergencyContact, EmergencyContactError>> {
		const mutation = gql`
			mutation SetPrimaryEmergencyContact($id: UUID!, $employeeId: UUID!) {
				setPrimaryEmergencyContact(id: $id, employeeId: $employeeId) {
					id
					employeeId
					name
					phone
					relationship
					isPrimary
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				setPrimaryEmergencyContact: GraphQLEmergencyContact;
			}>(mutation, { id, employeeId });

			if (!result?.setPrimaryEmergencyContact) {
				return Result.error(new EmergencyContactNotFoundError(id));
			}

			const contact = this.mapToEntity(result.setPrimaryEmergencyContact);
			if (!contact) {
				return Result.error(
					new InvalidEmergencyContactError(
						'Invalid emergency contact data returned from setPrimary'
					)
				);
			}

			return Result.ok(contact);
		} catch {
			return Result.error(new EmergencyContactNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL emergency contact data to domain EmergencyContact entity.
	 * @private
	 * @returns EmergencyContact entity or null if data is invalid (resilient error handling)
	 */
	private mapToEntity(data: GraphQLEmergencyContact): EmergencyContact | null {
		try {
			const nameResult = ContactName.create(data.name);
			if (nameResult.isError) return null;

			const phoneResult = ContactPhone.create(data.phone);
			if (phoneResult.isError) return null;

			const relationshipResult = Relationship.create(data.relationship);
			if (relationshipResult.isError) return null;

			const createdAt = new Date(data.createdAt);
			const updatedAt = new Date(data.updatedAt);

			if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) return null;

			const contactResult = EmergencyContact.create({
				id: data.id,
				employeeId: data.employeeId,
				name: nameResult.value,
				phone: phoneResult.value,
				relationship: relationshipResult.value,
				isPrimary: data.isPrimary,
				createdAt,
				updatedAt
			});

			if (contactResult.isError) return null;

			return contactResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}
}
