// src/domain/Employee/EmployeeStatus.ts

export class EmployeeStatus {
	private constructor(public readonly value: 'active' | 'inactive') {}

	static readonly Active = new EmployeeStatus('active');
	static readonly Inactive = new EmployeeStatus('inactive');

	get isActive(): boolean {
		return this.value === 'active';
	}

	equals(other: EmployeeStatus): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}

	static fromString(value: string): EmployeeStatus {
		switch (value) {
			case 'active':
				return EmployeeStatus.Active;
			case 'inactive':
				return EmployeeStatus.Inactive;
			default:
				throw new Error(`Invalid employee status: ${value}`);
		}
	}

	toJSON(): string {
		return this.value;
	}
}
