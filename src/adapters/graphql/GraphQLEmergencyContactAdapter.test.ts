// src/adapters/graphql/GraphQLEmergencyContactAdapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLEmergencyContactAdapter } from './GraphQLEmergencyContactAdapter';
import { EmergencyContact, ContactName, ContactPhone, Relationship } from '$domain/EmergencyContact';
import { EmergencyContactNotFoundError } from '$domain/EmergencyContact';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * Mock GraphQLPort for testing
 */
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

/**
 * Helper to create valid GraphQL emergency contact data
 */
function createGraphQLContact(overrides: Partial<{
	id: string;
	employeeId: string;
	name: string;
	phone: string;
	relationship: string;
	isPrimary: boolean;
	createdAt: string;
	updatedAt: string;
}> = {}) {
	return {
		id: '123e4567-e89b-12d3-a456-426614174000',
		employeeId: '123e4567-e89b-12d3-a456-426614174001',
		name: 'Jane Doe',
		phone: '+1 555-0100',
		relationship: 'spouse',
		isPrimary: false,
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2025-01-01T00:00:00.000Z',
		...overrides
	};
}

function createMockDomainContact(): EmergencyContact {
	const name = ContactName.create('Jane Doe').value;
	const phone = ContactPhone.create('+1 555-0100').value;
	const rel = Relationship.create('spouse').value;

	return EmergencyContact.create({
		id: '123e4567-e89b-12d3-a456-426614174000',
		employeeId: '123e4567-e89b-12d3-a456-426614174001',
		name,
		phone,
		relationship: rel,
		isPrimary: false,
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01')
	}).value;
}

describe('GraphQLEmergencyContactAdapter', () => {
	let adapter: GraphQLEmergencyContactAdapter;
	let mockGraphQL: MockGraphQLPort;

	beforeEach(() => {
		mockGraphQL = new MockGraphQLPort();
		adapter = new GraphQLEmergencyContactAdapter(mockGraphQL);
	});

	describe('findById', () => {
		it('should return emergency contact when found', async () => {
			const graphqlData = createGraphQLContact();
			mockGraphQL.setMockData({ emergencyContact: graphqlData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(EmergencyContact);
			expect(result.value?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
		});

		it('should return null when contact not found', async () => {
			mockGraphQL.setMockData({ emergencyContact: null });

			const result = await adapter.findById('nonexistent-id');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid contact data', async () => {
			const invalidData = createGraphQLContact({ relationship: 'invalid-relationship' });
			mockGraphQL.setMockData({ emergencyContact: invalidData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle GraphQL query errors gracefully', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should map all fields correctly', async () => {
			const graphqlData = createGraphQLContact({
				isPrimary: true,
				relationship: 'parent'
			});
			mockGraphQL.setMockData({ emergencyContact: graphqlData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value?.isPrimary).toBe(true);
			expect(result.value?.relationship.value).toBe('parent');
		});
	});

	describe('findByEmployeeId', () => {
		it('should return all contacts for employee', async () => {
			const contacts = [
				createGraphQLContact({ id: '123e4567-e89b-12d3-a456-426614174000' }),
				createGraphQLContact({ id: '123e4567-e89b-12d3-a456-426614174002' })
			];
			mockGraphQL.setMockData({ emergencyContactsByEmployee: contacts });

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no contacts found', async () => {
			mockGraphQL.setMockData({ emergencyContactsByEmployee: [] });

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid contacts', async () => {
			const contacts = [
				createGraphQLContact({ id: '123e4567-e89b-12d3-a456-426614174000' }),
				createGraphQLContact({
					id: '123e4567-e89b-12d3-a456-426614174002',
					relationship: 'invalid'
				})
			];
			mockGraphQL.setMockData({ emergencyContactsByEmployee: contacts });

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error on GraphQL query failure', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isError).toBe(true);
		});

		it('should handle null list gracefully', async () => {
			mockGraphQL.setMockData({ emergencyContactsByEmployee: null });

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('findPrimaryByEmployeeId', () => {
		it('should return primary contact when exists', async () => {
			const graphqlData = createGraphQLContact({ isPrimary: true });
			mockGraphQL.setMockData({ primaryEmergencyContact: graphqlData });

			const result = await adapter.findPrimaryByEmployeeId(
				'123e4567-e89b-12d3-a456-426614174001'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(EmergencyContact);
			expect(result.value?.isPrimary).toBe(true);
		});

		it('should return null when no primary contact exists', async () => {
			mockGraphQL.setMockData({ primaryEmergencyContact: null });

			const result = await adapter.findPrimaryByEmployeeId(
				'123e4567-e89b-12d3-a456-426614174001'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle GraphQL query errors gracefully', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findPrimaryByEmployeeId(
				'123e4567-e89b-12d3-a456-426614174001'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('create', () => {
		it('should create emergency contact', async () => {
			const graphqlData = createGraphQLContact();
			mockGraphQL.setMockData({ createEmergencyContact: graphqlData });

			const contact = createMockDomainContact();
			const result = await adapter.create(contact);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(EmergencyContact);
		});

		it('should return error when create returns null', async () => {
			mockGraphQL.setMockData({ createEmergencyContact: null });

			const contact = createMockDomainContact();
			const result = await adapter.create(contact);

			expect(result.isError).toBe(true);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const contact = createMockDomainContact();
			const result = await adapter.create(contact);

			expect(result.isError).toBe(true);
		});

		it('should return error when created contact data is invalid', async () => {
			const invalidData = createGraphQLContact({ name: '' });
			mockGraphQL.setMockData({ createEmergencyContact: invalidData });

			const contact = createMockDomainContact();
			const result = await adapter.create(contact);

			expect(result.isError).toBe(true);
		});
	});

	describe('update', () => {
		it('should update emergency contact', async () => {
			const graphqlData = createGraphQLContact({ name: 'John Smith', phone: '+1 555-9999' });
			mockGraphQL.setMockData({ updateEmergencyContact: graphqlData });

			const contact = createMockDomainContact();
			const result = await adapter.update(contact);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(EmergencyContact);
		});

		it('should return error when update returns null', async () => {
			mockGraphQL.setMockData({ updateEmergencyContact: null });

			const contact = createMockDomainContact();
			const result = await adapter.update(contact);

			expect(result.isError).toBe(true);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const contact = createMockDomainContact();
			const result = await adapter.update(contact);

			expect(result.isError).toBe(true);
		});
	});

	describe('delete', () => {
		it('should delete emergency contact', async () => {
			mockGraphQL.setMockData({ deleteEmergencyContact: true });

			const result = await adapter.delete('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
		});

		it('should handle deletion when not found', async () => {
			mockGraphQL.setMockData({ deleteEmergencyContact: false });

			const result = await adapter.delete('nonexistent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmergencyContactNotFoundError);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.delete('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmergencyContactNotFoundError);
		});
	});

	describe('setPrimary', () => {
		it('should set contact as primary', async () => {
			const graphqlData = createGraphQLContact({ isPrimary: true });
			mockGraphQL.setMockData({ setPrimaryEmergencyContact: graphqlData });

			const result = await adapter.setPrimary(
				'123e4567-e89b-12d3-a456-426614174000',
				'123e4567-e89b-12d3-a456-426614174001'
			);

			expect(result.isOk).toBe(true);
			expect(result.value?.isPrimary).toBe(true);
		});

		it('should return error when contact not found for setPrimary', async () => {
			mockGraphQL.setMockData({ setPrimaryEmergencyContact: null });

			const result = await adapter.setPrimary(
				'nonexistent-id',
				'123e4567-e89b-12d3-a456-426614174001'
			);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmergencyContactNotFoundError);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.setPrimary(
				'123e4567-e89b-12d3-a456-426614174000',
				'123e4567-e89b-12d3-a456-426614174001'
			);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmergencyContactNotFoundError);
		});
	});

	describe('mapToEntity (via findById)', () => {
		it('should handle invalid name data', async () => {
			const invalidData = createGraphQLContact({ name: '' });
			mockGraphQL.setMockData({ emergencyContact: invalidData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle invalid phone data', async () => {
			const invalidData = createGraphQLContact({ phone: '123' }); // too short
			mockGraphQL.setMockData({ emergencyContact: invalidData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle invalid relationship data', async () => {
			const invalidData = createGraphQLContact({ relationship: 'stranger' });
			mockGraphQL.setMockData({ emergencyContact: invalidData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle invalid createdAt date', async () => {
			const invalidData = createGraphQLContact({ createdAt: 'not-a-date' });
			mockGraphQL.setMockData({ emergencyContact: invalidData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle invalid UUID', async () => {
			const invalidData = createGraphQLContact({ id: 'not-a-uuid' });
			mockGraphQL.setMockData({ emergencyContact: invalidData });

			const result = await adapter.findById('not-a-uuid');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle missing required fields', async () => {
			mockGraphQL.setMockData({
				emergencyContact: { id: '123e4567-e89b-12d3-a456-426614174000' }
			});

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should correctly map isImmediate relationship', async () => {
			const graphqlData = createGraphQLContact({ relationship: 'sibling' });
			mockGraphQL.setMockData({ emergencyContact: graphqlData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value?.relationship.isImmediate).toBe(true);
		});

		it('should correctly map non-immediate relationship', async () => {
			const graphqlData = createGraphQLContact({ relationship: 'friend' });
			mockGraphQL.setMockData({ emergencyContact: graphqlData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value?.relationship.isImmediate).toBe(false);
		});
	});
});
