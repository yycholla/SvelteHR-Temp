// src/domain/Department/DepartmentName.ts
import { Result } from '$domain/Result';
import { ValidationError } from '$domain/errors';

/**
 * Value object representing a department name.
 *
 * Enforces business rules:
 * - Length: 1-100 characters
 * - No leading/trailing whitespace
 * - Case-insensitive equality
 *
 * Immutable once created.
 */
export class DepartmentName {
	private constructor(public readonly value: string) {}

	static readonly MIN_LENGTH = 1;
	static readonly MAX_LENGTH = 100;

	/**
	 * Factory method to create a DepartmentName.
	 *
	 * @param name - The raw name string to validate
	 * @returns Result containing DepartmentName or ValidationError
	 */
	static create(name: string): Result<DepartmentName, ValidationError> {
		// Trim whitespace
		const trimmed = name?.trim() ?? '';

		// Validation: Empty check
		if (trimmed.length === 0) {
			return Result.error(
				new ValidationError('departmentName', 'Department name cannot be empty', name)
			);
		}

		// Validation: Length check
		if (trimmed.length < this.MIN_LENGTH || trimmed.length > this.MAX_LENGTH) {
			return Result.error(
				new ValidationError(
					'departmentName',
					`Department name must be between ${this.MIN_LENGTH} and ${this.MAX_LENGTH} characters`,
					name
				)
			);
		}

		return Result.ok(new DepartmentName(trimmed));
	}

	/**
	 * Case-insensitive equality check.
	 *
	 * @param other - Another DepartmentName to compare
	 * @returns true if names are equal (case-insensitive)
	 */
	equals(other: DepartmentName): boolean {
		return this.value.toLowerCase() === other.value.toLowerCase();
	}

	/**
	 * String representation for logging/debugging.
	 */
	toString(): string {
		return this.value;
	}
}
