// src/adapters/graphql/GraphQLOnboardingAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
import {
	OnboardingModule,
	OnboardingAssignment,
	OnboardingModuleNotFoundError,
	InvalidOnboardingModuleError,
	AssignmentNotFoundError,
	InvalidAssignmentError,
	OnboardingError,
	ModuleTitle,
	ModuleCategory
} from '$domain/Onboarding';
import type {
	OnboardingRepository,
	CreateModuleData,
	UpdateModuleData,
	CreateAssignmentData,
	FindModulesFilter
} from '$services/ports/OnboardingRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for onboarding modules
 */
interface GraphQLOnboardingModule {
	id: string;
	title: string;
	description: string | null;
	isActive: boolean;
	category: string;
	tags: string[];
	authorId: string;
}

/**
 * GraphQL schema response shape for onboarding assignments
 */
interface GraphQLOnboardingAssignment {
	id: string;
	userId: string;
	onboardingModuleId: string;
	assignedById: string;
	assignedAt: string;
	dueDate: string | null;
	completedAt: string | null;
}

/**
 * GraphQLOnboardingAdapter implements OnboardingRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLOnboardingAdapter(graphqlPort);
 * const result = await adapter.findModuleById('module-123');
 * if (result.isOk) {
 *   console.log(result.value.title.value);
 * }
 * ```
 */
export class GraphQLOnboardingAdapter implements OnboardingRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findModuleById(
		id: string
	): Promise<Result<OnboardingModule, OnboardingModuleNotFoundError>> {
		const query = gql`
			query GetOnboardingModule($id: UUID!) {
				onboardingModule(id: $id) {
					id
					title
					description
					isActive
					category
					tags
					authorId
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				onboardingModule: GraphQLOnboardingModule | null;
			}>(query, { id });

			if (!result?.onboardingModule) {
				return Result.error(new OnboardingModuleNotFoundError(id));
			}

			const module = this.mapToOnboardingModule(result.onboardingModule);
			if (!module) {
				return Result.error(new OnboardingModuleNotFoundError(id));
			}

			return Result.ok(module);
		} catch {
			return Result.error(new OnboardingModuleNotFoundError(id));
		}
	}

	async findAllModules(
		filter?: FindModulesFilter
	): Promise<Result<OnboardingModule[], OnboardingError>> {
		const query = gql`
			query GetOnboardingModules($isActive: Boolean, $category: String) {
				onboardingModules(isActive: $isActive, category: $category) {
					id
					title
					description
					isActive
					category
					tags
					authorId
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				onboardingModules: GraphQLOnboardingModule[];
			}>(query, filter ?? {});

			const modules = (result?.onboardingModules ?? [])
				.map((m) => this.mapToOnboardingModule(m))
				.filter((m): m is OnboardingModule => m !== null);

			return Result.ok(modules);
		} catch (error) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Failed to fetch onboarding modules: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createModule(data: CreateModuleData): Promise<Result<OnboardingModule, OnboardingError>> {
		const mutation = gql`
			mutation CreateOnboardingModule($input: CreateOnboardingModuleInput!) {
				onboarding {
					createOnboardingModule(input: $input) {
						id
						title
						description
						isActive
						category
						tags
						authorId
					}
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				onboarding: { createOnboardingModule: GraphQLOnboardingModule };
			}>(mutation, { input: data });

			if (!result?.onboarding?.createOnboardingModule) {
				return Result.error(new InvalidOnboardingModuleError('Failed to create onboarding module'));
			}

			const module = this.mapToOnboardingModule(result.onboarding.createOnboardingModule);
			if (!module) {
				return Result.error(new InvalidOnboardingModuleError('Invalid module data returned'));
			}

			return Result.ok(module);
		} catch (error) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Failed to create onboarding module: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateModule(
		id: string,
		data: UpdateModuleData
	): Promise<Result<OnboardingModule, OnboardingError>> {
		const mutation = gql`
			mutation UpdateOnboardingModule($id: UUID!, $input: UpdateOnboardingModuleInput!) {
				onboarding {
					updateOnboardingModule(id: $id, input: $input) {
						id
						title
						description
						isActive
						category
						tags
						authorId
					}
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				onboarding: { updateOnboardingModule: GraphQLOnboardingModule | null };
			}>(mutation, { id, input: data });

			if (!result?.onboarding?.updateOnboardingModule) {
				return Result.error(new OnboardingModuleNotFoundError(id));
			}

			const module = this.mapToOnboardingModule(result.onboarding.updateOnboardingModule);
			if (!module) {
				return Result.error(new InvalidOnboardingModuleError('Invalid module data returned'));
			}

			return Result.ok(module);
		} catch (error) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Failed to update onboarding module: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteModule(id: string): Promise<Result<void, OnboardingError>> {
		const mutation = gql`
			mutation DeleteOnboardingModule($id: UUID!) {
				onboarding {
					deleteOnboardingModule(id: $id)
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				onboarding: { deleteOnboardingModule: boolean };
			}>(mutation, { id });

			if (!result?.onboarding?.deleteOnboardingModule) {
				return Result.error(new OnboardingModuleNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new OnboardingModuleNotFoundError(id));
		}
	}

	async findAssignmentById(id: string): Promise<Result<OnboardingAssignment, OnboardingError>> {
		// Fetch by user assignments and filter, or use the module assignments.
		// Since there's no direct findById query, we use myOnboardingAssignments and scan.
		// This is a best-effort approach given the available operations.
		const query = gql`
			query GetMyOnboardingAssignments {
				myOnboardingAssignments {
					id
					userId
					onboardingModuleId
					assignedById
					assignedAt
					dueDate
					completedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				myOnboardingAssignments: GraphQLOnboardingAssignment[];
			}>(query, {});

			const assignments = result?.myOnboardingAssignments ?? [];
			const raw = assignments.find((a) => a.id === id);

			if (!raw) {
				return Result.error(new AssignmentNotFoundError(id));
			}

			const assignment = this.mapToOnboardingAssignment(raw);
			if (!assignment) {
				return Result.error(new AssignmentNotFoundError(id));
			}

			return Result.ok(assignment);
		} catch {
			return Result.error(new AssignmentNotFoundError(id));
		}
	}

	async findAssignmentsByUserId(
		userId: string
	): Promise<Result<OnboardingAssignment[], OnboardingError>> {
		const query = gql`
			query GetMyOnboardingAssignments {
				myOnboardingAssignments {
					id
					userId
					onboardingModuleId
					assignedById
					assignedAt
					dueDate
					completedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				myOnboardingAssignments: GraphQLOnboardingAssignment[];
			}>(query, { userId });

			const assignments = (result?.myOnboardingAssignments ?? [])
				.map((a) => this.mapToOnboardingAssignment(a))
				.filter((a): a is OnboardingAssignment => a !== null);

			return Result.ok(assignments);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch assignments for user: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findAssignmentsByModuleId(
		moduleId: string
	): Promise<Result<OnboardingAssignment[], OnboardingError>> {
		const query = gql`
			query GetOnboardingAssignments($onboardingModuleId: UUID!) {
				onboardingAssignments(onboardingModuleId: $onboardingModuleId) {
					id
					userId
					onboardingModuleId
					assignedById
					assignedAt
					dueDate
					completedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				onboardingAssignments: GraphQLOnboardingAssignment[];
			}>(query, { onboardingModuleId: moduleId });

			const assignments = (result?.onboardingAssignments ?? [])
				.map((a) => this.mapToOnboardingAssignment(a))
				.filter((a): a is OnboardingAssignment => a !== null);

			return Result.ok(assignments);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch assignments for module: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createAssignment(
		data: CreateAssignmentData
	): Promise<Result<OnboardingAssignment, OnboardingError>> {
		const mutation = gql`
			mutation AssignOnboarding($input: CreateOnboardingAssignmentInput!) {
				onboarding {
					assignOnboarding(input: $input) {
						id
						userId
						onboardingModuleId
						assignedById
						assignedAt
						dueDate
						completedAt
					}
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				onboarding: { assignOnboarding: GraphQLOnboardingAssignment };
			}>(mutation, { input: data });

			if (!result?.onboarding?.assignOnboarding) {
				return Result.error(new InvalidAssignmentError('Failed to create onboarding assignment'));
			}

			const assignment = this.mapToOnboardingAssignment(result.onboarding.assignOnboarding);
			if (!assignment) {
				return Result.error(new InvalidAssignmentError('Invalid assignment data returned'));
			}

			return Result.ok(assignment);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to create onboarding assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async completeAssignment(id: string): Promise<Result<OnboardingAssignment, OnboardingError>> {
		const mutation = gql`
			mutation CompleteOnboardingAssignment($id: UUID!) {
				onboarding {
					completeAssignment(id: $id) {
						id
						userId
						onboardingModuleId
						assignedById
						assignedAt
						dueDate
						completedAt
					}
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				onboarding: { completeAssignment: GraphQLOnboardingAssignment | null };
			}>(mutation, { id });

			if (!result?.onboarding?.completeAssignment) {
				return Result.error(new AssignmentNotFoundError(id));
			}

			const assignment = this.mapToOnboardingAssignment(result.onboarding.completeAssignment);
			if (!assignment) {
				return Result.error(new AssignmentNotFoundError(id));
			}

			return Result.ok(assignment);
		} catch {
			return Result.error(new AssignmentNotFoundError(id));
		}
	}

	async deleteAssignment(id: string): Promise<Result<void, OnboardingError>> {
		const mutation = gql`
			mutation DeleteOnboardingAssignment($id: UUID!) {
				onboarding {
					deleteOnboardingAssignment(id: $id)
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				onboarding: { deleteOnboardingAssignment: boolean };
			}>(mutation, { id });

			if (!result?.onboarding?.deleteOnboardingAssignment) {
				return Result.error(new AssignmentNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new AssignmentNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL onboarding module data to domain OnboardingModule entity.
	 * @private
	 * @returns OnboardingModule entity or null if data is invalid (resilient error handling)
	 */
	private mapToOnboardingModule(data: GraphQLOnboardingModule): OnboardingModule | null {
		try {
			const titleResult = ModuleTitle.create(data.title);
			if (titleResult.isError) return null;

			const categoryResult = ModuleCategory.create(data.category);
			if (categoryResult.isError) return null;

			const moduleResult = OnboardingModule.create({
				id: data.id,
				title: titleResult.value,
				description: data.description,
				isActive: data.isActive,
				category: categoryResult.value,
				tags: data.tags ?? [],
				authorId: data.authorId
			});

			if (moduleResult.isError) return null;

			return moduleResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}

	/**
	 * Map GraphQL onboarding assignment data to domain OnboardingAssignment entity.
	 * @private
	 * @returns OnboardingAssignment entity or null if data is invalid (resilient error handling)
	 */
	private mapToOnboardingAssignment(
		data: GraphQLOnboardingAssignment
	): OnboardingAssignment | null {
		try {
			const assignedAt = new Date(data.assignedAt);
			if (isNaN(assignedAt.getTime())) return null;

			const dueDate = data.dueDate ? new Date(data.dueDate) : null;
			if (dueDate !== null && isNaN(dueDate.getTime())) return null;

			const completedAt = data.completedAt ? new Date(data.completedAt) : null;
			if (completedAt !== null && isNaN(completedAt.getTime())) return null;

			const assignmentResult = OnboardingAssignment.create({
				id: data.id,
				userId: data.userId,
				onboardingModuleId: data.onboardingModuleId,
				assignedById: data.assignedById,
				assignedAt,
				dueDate,
				completedAt
			});

			if (assignmentResult.isError) return null;

			return assignmentResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}
}
