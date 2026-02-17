// src/services/ports/OnboardingRepository.ts
import type { Result } from '$domain/Result';
import type { OnboardingModule, OnboardingAssignment, OnboardingError } from '$domain/Onboarding';

export interface CreateModuleData {
	title: string;
	description?: string | null;
	isActive?: boolean;
	category: string;
	tags?: string[];
	authorId: string;
}

export interface UpdateModuleData {
	title?: string;
	description?: string | null;
	isActive?: boolean;
	category?: string;
	tags?: string[];
}

export interface FindModulesFilter {
	isActive?: boolean;
	category?: string;
}

export interface CreateAssignmentData {
	userId: string;
	onboardingModuleId: string;
	assignedById: string;
	dueDate?: string | null; // ISO date string or null
}

export interface OnboardingRepository {
	/**
	 * Find an onboarding module by ID
	 * @returns Module if found, error otherwise
	 */
	findModuleById(id: string): Promise<Result<OnboardingModule, OnboardingError>>;

	/**
	 * Find all onboarding modules with optional filtering
	 * @returns Array of modules or error
	 */
	findAllModules(filter?: FindModulesFilter): Promise<Result<OnboardingModule[], OnboardingError>>;

	/**
	 * Create a new onboarding module
	 * @returns Created module or error
	 */
	createModule(data: CreateModuleData): Promise<Result<OnboardingModule, OnboardingError>>;

	/**
	 * Update an existing onboarding module
	 * @returns Updated module or error
	 */
	updateModule(
		id: string,
		data: UpdateModuleData
	): Promise<Result<OnboardingModule, OnboardingError>>;

	/**
	 * Delete an onboarding module
	 * @returns Success or error
	 */
	deleteModule(id: string): Promise<Result<void, OnboardingError>>;

	/**
	 * Find an onboarding assignment by ID
	 * @returns Assignment if found, error otherwise
	 */
	findAssignmentById(id: string): Promise<Result<OnboardingAssignment, OnboardingError>>;

	/**
	 * Find all assignments for a specific user
	 * @returns Array of assignments or error
	 */
	findAssignmentsByUserId(userId: string): Promise<Result<OnboardingAssignment[], OnboardingError>>;

	/**
	 * Find all assignments for a specific module
	 * @returns Array of assignments or error
	 */
	findAssignmentsByModuleId(
		moduleId: string
	): Promise<Result<OnboardingAssignment[], OnboardingError>>;

	/**
	 * Create a new onboarding assignment
	 * @returns Created assignment or error
	 */
	createAssignment(
		data: CreateAssignmentData
	): Promise<Result<OnboardingAssignment, OnboardingError>>;

	/**
	 * Mark an assignment as completed
	 * @returns Updated assignment or error
	 */
	completeAssignment(id: string): Promise<Result<OnboardingAssignment, OnboardingError>>;

	/**
	 * Delete an onboarding assignment
	 * @returns Success or error
	 */
	deleteAssignment(id: string): Promise<Result<void, OnboardingError>>;
}
