// src/services/ports/GoalRepository.ts
import { Result } from '$domain/Result';
import { Goal, GoalNotFoundError, GoalValidationError, GoalError } from '$domain/Goal';

export interface GoalFilter {
	employeeId?: string;
	status?: string;
	priority?: string;
	quarter?: string;
	year?: number;
	limit?: number;
	offset?: number;
}

export interface CreateGoalData {
	employeeId: string;
	title: string;
	description: string;
	targetDate: string;
	progress?: number;
	status?: string;
	priority?: string;
	quarter?: string;
	year?: number;
	createdBy: string;
}

export interface UpdateGoalData {
	title?: string;
	description?: string;
	targetDate?: string;
	progress?: number;
	status?: string;
	priority?: string;
	quarter?: string;
	year?: number;
}

export interface GoalRepository {
	/**
	 * Find a goal by ID
	 * @returns Goal if found, NotFoundError otherwise
	 */
	findById(id: string): Promise<Result<Goal, GoalNotFoundError>>;

	/**
	 * Find all goals with optional filtering
	 * @returns Array of goals or error
	 */
	findAll(filter?: GoalFilter): Promise<Result<Goal[], GoalError>>;

	/**
	 * Create a new goal
	 * @returns Created goal or validation error
	 */
	create(data: CreateGoalData): Promise<Result<Goal, GoalValidationError>>;

	/**
	 * Update an existing goal
	 * @returns Updated goal or error
	 */
	update(id: string, data: UpdateGoalData): Promise<Result<Goal, GoalError>>;

	/**
	 * Delete a goal
	 * @returns Success or not found error
	 */
	delete(id: string): Promise<Result<void, GoalNotFoundError>>;

	/**
	 * Get goals for an employee
	 * @returns Array of goals for the employee
	 */
	getGoalsForEmployee(employeeId: string): Promise<Result<Goal[], GoalError>>;

	/**
	 * Get goals by status
	 * @returns Array of goals with the specified status
	 */
	getGoalsByStatus(status: string): Promise<Result<Goal[], GoalError>>;
}
