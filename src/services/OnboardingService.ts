// src/services/OnboardingService.ts
import { Result } from '$domain/Result';
import {
	type OnboardingModule,
	type OnboardingAssignment,
	type OnboardingError,
	InvalidOnboardingModuleError,
	InvalidAssignmentError
} from '$domain/Onboarding';
import type {
	OnboardingRepository,
	CreateModuleData,
	UpdateModuleData,
	FindModulesFilter,
	CreateAssignmentData
} from './ports/OnboardingRepository';

/**
 * Application service for managing onboarding modules and assignments.
 * Orchestrates domain logic and repository operations.
 */
export class OnboardingService {
	constructor(private readonly repository: OnboardingRepository) {}

	/**
	 * Get an onboarding module by ID
	 * @param id - The module ID
	 * @returns Result containing the module or an error
	 */
	async getModuleById(id: string): Promise<Result<OnboardingModule, OnboardingError>> {
		try {
			return await this.repository.findModuleById(id);
		} catch (error) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Failed to fetch onboarding module: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all onboarding modules with optional filtering
	 * @param filter - Optional filters for the query
	 * @returns Result containing array of modules or an error
	 */
	async getAllModules(
		filter?: FindModulesFilter
	): Promise<Result<OnboardingModule[], OnboardingError>> {
		try {
			return await this.repository.findAllModules(filter);
		} catch (error) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Failed to fetch onboarding modules: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Create a new onboarding module
	 * @param data - The module data
	 * @returns Result containing the created module or an error
	 */
	async createModule(data: CreateModuleData): Promise<Result<OnboardingModule, OnboardingError>> {
		try {
			return await this.repository.createModule(data);
		} catch (error) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Failed to create onboarding module: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Update an existing onboarding module
	 * @param id - The module ID
	 * @param data - The fields to update
	 * @returns Result containing the updated module or an error
	 */
	async updateModule(
		id: string,
		data: UpdateModuleData
	): Promise<Result<OnboardingModule, OnboardingError>> {
		try {
			return await this.repository.updateModule(id, data);
		} catch (error) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Failed to update onboarding module: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Delete an onboarding module
	 * @param id - The module ID
	 * @returns Result indicating success or an error
	 */
	async deleteModule(id: string): Promise<Result<void, OnboardingError>> {
		try {
			return await this.repository.deleteModule(id);
		} catch (error) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Failed to delete onboarding module: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get an onboarding assignment by ID
	 * @param id - The assignment ID
	 * @returns Result containing the assignment or an error
	 */
	async getAssignmentById(id: string): Promise<Result<OnboardingAssignment, OnboardingError>> {
		try {
			return await this.repository.findAssignmentById(id);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch onboarding assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all assignments for a specific user
	 * @param userId - The user's ID
	 * @returns Result containing array of assignments or an error
	 */
	async getAssignmentsByUserId(
		userId: string
	): Promise<Result<OnboardingAssignment[], OnboardingError>> {
		try {
			return await this.repository.findAssignmentsByUserId(userId);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch assignments for user: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all assignments for a specific module
	 * @param moduleId - The module's ID
	 * @returns Result containing array of assignments or an error
	 */
	async getAssignmentsByModuleId(
		moduleId: string
	): Promise<Result<OnboardingAssignment[], OnboardingError>> {
		try {
			return await this.repository.findAssignmentsByModuleId(moduleId);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch assignments for module: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Create a new onboarding assignment
	 * @param data - The assignment data
	 * @returns Result containing the created assignment or an error
	 */
	async createAssignment(
		data: CreateAssignmentData
	): Promise<Result<OnboardingAssignment, OnboardingError>> {
		try {
			return await this.repository.createAssignment(data);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to create onboarding assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Mark an assignment as completed
	 * @param id - The assignment ID
	 * @returns Result containing the updated assignment or an error
	 */
	async completeAssignment(id: string): Promise<Result<OnboardingAssignment, OnboardingError>> {
		try {
			return await this.repository.completeAssignment(id);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to complete onboarding assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Delete an onboarding assignment
	 * @param id - The assignment ID
	 * @returns Result indicating success or an error
	 */
	async deleteAssignment(id: string): Promise<Result<void, OnboardingError>> {
		try {
			return await this.repository.deleteAssignment(id);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to delete onboarding assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
