// src/domain/Employee/Employee.ts
import { Result } from '$domain/Result';
import { DomainError, EmployeeDeactivationError } from '$domain/errors';
import { Email } from './Email';
import { PersonName } from './PersonName';
import { HireDate } from './HireDate';
import { EmployeeStatus } from './EmployeeStatus';
import type { CreateEmployeeData } from './types';

export class Employee {
	private constructor(
		public readonly id: string,
		public readonly email: Email,
		private _name: PersonName,
		public readonly hireDate: HireDate,
		private _status: EmployeeStatus,
		private _departmentId: string | null,
		private _jobTitle: string | null,
		private _phone: string | null
	) {}

	get name(): PersonName {
		return this._name;
	}

	static create(data: CreateEmployeeData): Result<Employee, DomainError> {
		// Validate ID format (must be UUID)
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!data.id || !uuidRegex.test(data.id)) {
			return Result.error(
				new DomainError('Invalid employee ID format', 'invalid_uuid', { value: data.id })
			);
		}

		// Validate email
		const emailResult = Email.create(data.email);
		if (emailResult.isError) return Result.error(emailResult.error);

		// Validate name
		const nameResult = PersonName.create(data.firstName, data.lastName);
		if (nameResult.isError) return Result.error(nameResult.error);

		// Validate hire date
		const hireDateResult = HireDate.create(data.hireDate);
		if (hireDateResult.isError) return Result.error(hireDateResult.error);

		// Validate departmentId format if provided
		let departmentId: string | null = null;
		if (data.departmentId !== null && data.departmentId !== undefined) {
			if (!uuidRegex.test(data.departmentId)) {
				return Result.error(
					new DomainError('Invalid department ID format', 'invalid_uuid', {
						value: data.departmentId
					})
				);
			}
			departmentId = data.departmentId;
		}

		// Validate jobTitle if provided
		let jobTitle: string | null = null;
		if (data.jobTitle !== null && data.jobTitle !== undefined) {
			const trimmed = data.jobTitle.trim();
			if (trimmed.length === 0) {
				jobTitle = null; // Empty string becomes null
			} else if (trimmed.length > 100) {
				return Result.error(
					new DomainError('Job title exceeds maximum length of 100 characters', 'max_length', {
						value: data.jobTitle,
						max: 100
					})
				);
			} else {
				jobTitle = trimmed;
			}
		}

		// Validate phone format if provided
		let phone: string | null = null;
		if (data.phone !== null && data.phone !== undefined) {
			const trimmed = data.phone.trim();
			if (trimmed.length > 0) {
				// Basic international phone format: + followed by 10-15 digits
				const phoneRegex = /^\+?[1-9]\d{9,14}$/;
				const normalized = trimmed.replace(/[\s-]/g, '');
				if (!phoneRegex.test(normalized)) {
					return Result.error(
						new DomainError('Invalid phone number format', 'invalid_format', { value: data.phone })
					);
				}
				phone = trimmed;
			} else {
				phone = null; // Empty string becomes null
			}
		}

		return Result.ok(
			new Employee(
				data.id,
				emailResult.value,
				nameResult.value,
				hireDateResult.value,
				EmployeeStatus.Active,
				departmentId,
				jobTitle,
				phone
			)
		);
	}

	// Getters
	get status(): string {
		return this._status.value;
	}

	get isActive(): boolean {
		return this._status.isActive;
	}

	get departmentId(): string | null {
		return this._departmentId;
	}

	get jobTitle(): string | null {
		return this._jobTitle;
	}

	get phone(): string | null {
		return this._phone;
	}

	get fullName(): string {
		return this.name.fullName;
	}

	get displayName(): string {
		return this.name.displayName;
	}

	// Business methods
	deactivate(): Result<void, EmployeeDeactivationError> {
		if (!this._status.isActive) {
			return Result.error(new EmployeeDeactivationError(this.id, 'Employee is already inactive'));
		}
		this._status = EmployeeStatus.Inactive;
		return Result.ok(undefined);
	}

	activate(): Result<void, DomainError> {
		if (this._status.isActive) {
			return Result.error(
				new DomainError('Employee is already active', 'EMPLOYEE_ALREADY_ACTIVE', {
					employeeId: this.id
				})
			);
		}
		this._status = EmployeeStatus.Active;
		return Result.ok(undefined);
	}

	changeDepartment(departmentId: string | null): Result<void, DomainError> {
		if (departmentId !== null) {
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!uuidRegex.test(departmentId)) {
				return Result.error(
					new DomainError('Invalid department ID format', 'invalid_uuid', {
						value: departmentId
					})
				);
			}
		}
		this._departmentId = departmentId;
		return Result.ok(undefined);
	}

	updateJobTitle(jobTitle: string | null): Result<void, DomainError> {
		if (jobTitle !== null) {
			const trimmed = jobTitle.trim();
			if (trimmed.length === 0) {
				this._jobTitle = null;
				return Result.ok(undefined);
			}
			if (trimmed.length > 100) {
				return Result.error(
					new DomainError('Job title exceeds maximum length of 100 characters', 'max_length', {
						value: jobTitle,
						max: 100
					})
				);
			}
			this._jobTitle = trimmed;
		} else {
			this._jobTitle = null;
		}
		return Result.ok(undefined);
	}

	updatePhone(phone: string | null): Result<void, DomainError> {
		if (phone !== null) {
			const trimmed = phone.trim();
			if (trimmed.length === 0) {
				this._phone = null;
				return Result.ok(undefined);
			}
			const phoneRegex = /^\+?[1-9]\d{9,14}$/;
			const normalized = trimmed.replace(/[\s-]/g, '');
			if (!phoneRegex.test(normalized)) {
				return Result.error(
					new DomainError('Invalid phone number format', 'invalid_format', { value: phone })
				);
			}
			this._phone = trimmed;
		} else {
			this._phone = null;
		}
		return Result.ok(undefined);
	}

	updateFirstName(firstName: string): Result<void, DomainError> {
		const nameResult = PersonName.create(firstName, this._name.last);
		if (nameResult.isError) {
			return Result.error(nameResult.error);
		}
		this._name = nameResult.value;
		return Result.ok(undefined);
	}
}
