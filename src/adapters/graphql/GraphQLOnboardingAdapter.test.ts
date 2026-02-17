// src/adapters/graphql/GraphQLOnboardingAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLOnboardingAdapter } from './GraphQLOnboardingAdapter';
import {
	OnboardingModuleNotFoundError,
	InvalidOnboardingModuleError,
	AssignmentNotFoundError,
	InvalidAssignmentError
} from '$domain/Onboarding';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

// Mock GraphQLPort
function createMockGraphQLPort(responses: {
	query?: unknown;
	mutation?: unknown;
	queryError?: Error;
	mutationError?: Error;
}): GraphQLPort {
	return {
		query: async () => {
			if (responses.queryError) throw responses.queryError;
			return responses.query ?? null;
		},
		mutation: async () => {
			if (responses.mutationError) throw responses.mutationError;
			return responses.mutation ?? null;
		}
	} as GraphQLPort;
}

// Helper to create valid module data
function createValidModuleData() {
	return {
		id: '123e4567-e89b-12d3-a456-426614174000',
		title: 'New Employee Orientation',
		description: 'Welcome to the company',
		isActive: true,
		category: 'orientation',
		tags: ['onboarding', 'welcome'],
		authorId: '123e4567-e89b-12d3-a456-426614174001'
	};
}

// Helper to create valid assignment data
function createValidAssignmentData() {
	return {
		id: '123e4567-e89b-12d3-a456-426614174002',
		userId: '123e4567-e89b-12d3-a456-426614174003',
		onboardingModuleId: '123e4567-e89b-12d3-a456-426614174000',
		assignedById: '123e4567-e89b-12d3-a456-426614174004',
		assignedAt: '2024-01-01T00:00:00Z',
		dueDate: null,
		completedAt: null
	};
}

describe('GraphQLOnboardingAdapter', () => {
	describe('findModuleById', () => {
		it('should return module when found', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModule: createValidModuleData()
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findModuleById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('123e4567-e89b-12d3-a456-426614174000');
			expect(result.value.title.value).toBe('New Employee Orientation');
			expect(result.value.category.value).toBe('orientation');
		});

		it('should return error when module not found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { onboardingModule: null }
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findModuleById('nonexistent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findModuleById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
		});

		it('should return error when module data is invalid (bad category)', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModule: {
						...createValidModuleData(),
						category: 'invalid_category'
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findModuleById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
		});

		it('should return error when module data is invalid (empty title)', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModule: {
						...createValidModuleData(),
						title: ''
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findModuleById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
		});

		it('should handle module with null description', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModule: {
						...createValidModuleData(),
						description: null
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findModuleById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBeNull();
		});
	});

	describe('findAllModules', () => {
		it('should return all modules', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModules: [
						createValidModuleData(),
						{
							...createValidModuleData(),
							id: '123e4567-e89b-12d3-a456-426614174005',
							title: 'Compliance Training'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAllModules();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no modules found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { onboardingModules: [] }
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAllModules();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid module records', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModules: [
						createValidModuleData(),
						{ ...createValidModuleData(), category: 'invalid_category' }, // Invalid
						{
							...createValidModuleData(),
							id: '123e4567-e89b-12d3-a456-426614174005',
							title: 'Compliance Training'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAllModules();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2); // Invalid module skipped
		});

		it('should handle null response gracefully', async () => {
			const mockPort = createMockGraphQLPort({
				query: null
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAllModules();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAllModules();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			expect(result.error.message).toContain('Network error');
		});

		it('should pass filter when provided', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModules: [createValidModuleData()]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAllModules({ isActive: true, category: 'orientation' });

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});
	});

	describe('createModule', () => {
		it('should create module successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: {
						createOnboardingModule: createValidModuleData()
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.createModule({
				title: 'New Employee Orientation',
				description: 'Welcome to the company',
				isActive: true,
				category: 'orientation',
				tags: ['onboarding'],
				authorId: '123e4567-e89b-12d3-a456-426614174001'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('New Employee Orientation');
		});

		it('should return error when creation returns null', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: { createOnboardingModule: null }
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.createModule({
				title: 'Test Module',
				category: 'orientation',
				authorId: '123e4567-e89b-12d3-a456-426614174001'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
		});

		it('should return error when returned data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: {
						createOnboardingModule: {
							...createValidModuleData(),
							category: 'invalid_category'
						}
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.createModule({
				title: 'Test Module',
				category: 'orientation',
				authorId: '123e4567-e89b-12d3-a456-426614174001'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Validation failed')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.createModule({
				title: 'Test Module',
				category: 'orientation',
				authorId: '123e4567-e89b-12d3-a456-426614174001'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			expect(result.error.message).toContain('Validation failed');
		});
	});

	describe('updateModule', () => {
		it('should update module successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: {
						updateOnboardingModule: {
							...createValidModuleData(),
							title: 'Updated Orientation'
						}
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.updateModule('123e4567-e89b-12d3-a456-426614174000', {
				title: 'Updated Orientation'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated Orientation');
		});

		it('should return error when module not found', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: { updateOnboardingModule: null }
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.updateModule('nonexistent-id', { title: 'Updated' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
		});

		it('should return error when returned data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: {
						updateOnboardingModule: {
							...createValidModuleData(),
							category: 'invalid_category'
						}
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.updateModule('123e4567-e89b-12d3-a456-426614174000', {
				category: 'orientation'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Update failed')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.updateModule('123e4567-e89b-12d3-a456-426614174000', {
				title: 'Updated'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			expect(result.error.message).toContain('Update failed');
		});
	});

	describe('deleteModule', () => {
		it('should delete module successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: { deleteOnboardingModule: true }
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.deleteModule('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeUndefined();
		});

		it('should return error when deletion returns false', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: { deleteOnboardingModule: false }
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.deleteModule('nonexistent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Delete failed')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.deleteModule('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(OnboardingModuleNotFoundError);
		});
	});

	describe('findAssignmentsByUserId', () => {
		it('should return assignments for user', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					myOnboardingAssignments: [
						createValidAssignmentData(),
						{
							...createValidAssignmentData(),
							id: '123e4567-e89b-12d3-a456-426614174009'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByUserId('123e4567-e89b-12d3-a456-426614174003');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no assignments found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { myOnboardingAssignments: [] }
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByUserId('123e4567-e89b-12d3-a456-426614174003');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid assignment records', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					myOnboardingAssignments: [
						createValidAssignmentData(),
						{ ...createValidAssignmentData(), assignedAt: 'invalid-date' }, // Invalid
						{
							...createValidAssignmentData(),
							id: '123e4567-e89b-12d3-a456-426614174009'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByUserId('123e4567-e89b-12d3-a456-426614174003');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2); // Invalid assignment skipped
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByUserId('123e4567-e89b-12d3-a456-426614174003');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	describe('findAssignmentsByModuleId', () => {
		it('should return assignments for module', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingAssignments: [
						createValidAssignmentData(),
						{
							...createValidAssignmentData(),
							id: '123e4567-e89b-12d3-a456-426614174009',
							userId: '123e4567-e89b-12d3-a456-426614174008'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByModuleId(
				'123e4567-e89b-12d3-a456-426614174000'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no assignments exist for module', async () => {
			const mockPort = createMockGraphQLPort({
				query: { onboardingAssignments: [] }
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByModuleId(
				'123e4567-e89b-12d3-a456-426614174000'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid records', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingAssignments: [
						createValidAssignmentData(),
						{ ...createValidAssignmentData(), userId: 'not-a-uuid' }, // Invalid
						{
							...createValidAssignmentData(),
							id: '123e4567-e89b-12d3-a456-426614174009',
							userId: '123e4567-e89b-12d3-a456-426614174008'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByModuleId(
				'123e4567-e89b-12d3-a456-426614174000'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2); // Invalid skipped
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByModuleId(
				'123e4567-e89b-12d3-a456-426614174000'
			);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	describe('createAssignment', () => {
		it('should create assignment successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: {
						assignOnboarding: createValidAssignmentData()
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.createAssignment({
				userId: '123e4567-e89b-12d3-a456-426614174003',
				onboardingModuleId: '123e4567-e89b-12d3-a456-426614174000',
				assignedById: '123e4567-e89b-12d3-a456-426614174004',
				dueDate: null
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('123e4567-e89b-12d3-a456-426614174002');
		});

		it('should return error when creation returns null', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: { assignOnboarding: null }
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.createAssignment({
				userId: '123e4567-e89b-12d3-a456-426614174003',
				onboardingModuleId: '123e4567-e89b-12d3-a456-426614174000',
				assignedById: '123e4567-e89b-12d3-a456-426614174004',
				dueDate: null
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Assignment failed')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.createAssignment({
				userId: '123e4567-e89b-12d3-a456-426614174003',
				onboardingModuleId: '123e4567-e89b-12d3-a456-426614174000',
				assignedById: '123e4567-e89b-12d3-a456-426614174004',
				dueDate: null
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('Assignment failed');
		});
	});

	describe('completeAssignment', () => {
		it('should complete assignment successfully with completedAt set', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: {
						completeAssignment: {
							...createValidAssignmentData(),
							completedAt: '2024-02-01T10:00:00Z'
						}
					}
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.completeAssignment('123e4567-e89b-12d3-a456-426614174002');

			expect(result.isOk).toBe(true);
			expect(result.value.completedAt).toBeInstanceOf(Date);
			expect(result.value.isCompleted()).toBe(true);
		});

		it('should return error when assignment not found', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: { completeAssignment: null }
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.completeAssignment('nonexistent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Complete failed')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.completeAssignment('123e4567-e89b-12d3-a456-426614174002');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
		});
	});

	describe('deleteAssignment', () => {
		it('should delete assignment successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: { deleteOnboardingAssignment: true }
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.deleteAssignment('123e4567-e89b-12d3-a456-426614174002');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeUndefined();
		});

		it('should return error when deletion returns false', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					onboarding: { deleteOnboardingAssignment: false }
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.deleteAssignment('nonexistent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Delete failed')
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.deleteAssignment('123e4567-e89b-12d3-a456-426614174002');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
		});
	});

	describe('mapToOnboardingModule - resilient error handling', () => {
		it('should skip modules with invalid author ID format', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModules: [
						createValidModuleData(),
						{ ...createValidModuleData(), authorId: 'not-a-uuid' }, // Invalid
						{
							...createValidModuleData(),
							id: '123e4567-e89b-12d3-a456-426614174005',
							title: 'Technical Training'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAllModules();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should skip modules with invalid ID format', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingModules: [
						createValidModuleData(),
						{ ...createValidModuleData(), id: 'not-a-uuid' }, // Invalid
						{
							...createValidModuleData(),
							id: '123e4567-e89b-12d3-a456-426614174005',
							title: 'Compliance Training'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAllModules();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});
	});

	describe('mapToOnboardingAssignment - resilient error handling', () => {
		it('should skip assignments with invalid date', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingAssignments: [
						createValidAssignmentData(),
						{ ...createValidAssignmentData(), assignedAt: 'not-a-date' }, // Invalid
						{
							...createValidAssignmentData(),
							id: '123e4567-e89b-12d3-a456-426614174009',
							userId: '123e4567-e89b-12d3-a456-426614174008'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByModuleId(
				'123e4567-e89b-12d3-a456-426614174000'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should handle assignments with due date', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					onboardingAssignments: [
						{
							...createValidAssignmentData(),
							dueDate: '2024-03-01T00:00:00Z'
						}
					]
				}
			});

			const adapter = new GraphQLOnboardingAdapter(mockPort);
			const result = await adapter.findAssignmentsByModuleId(
				'123e4567-e89b-12d3-a456-426614174000'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].dueDate).toBeInstanceOf(Date);
		});
	});
});
