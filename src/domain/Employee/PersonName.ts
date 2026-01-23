// src/domain/Employee/PersonName.ts
import { Result } from '$domain/Result';
import { ValidationError } from '$domain/errors';

export class PersonName {
	private constructor(
		public readonly first: string,
		public readonly last: string
	) {}

	static create(first: string, last: string): Result<PersonName, ValidationError> {
		const trimmedFirst = first?.trim() || '';
		const trimmedLast = last?.trim() || '';

		if (trimmedFirst.length === 0) {
			return Result.error(new ValidationError('first', 'required', first));
		}
		if (trimmedLast.length === 0) {
			return Result.error(new ValidationError('last', 'required', last));
		}
		if (trimmedFirst.length > 100) {
			return Result.error(new ValidationError('first', 'max_length', first));
		}
		if (trimmedLast.length > 100) {
			return Result.error(new ValidationError('last', 'max_length', last));
		}

		return Result.ok(new PersonName(trimmedFirst, trimmedLast));
	}

	get fullName(): string {
		return `${this.first} ${this.last}`;
	}

	get displayName(): string {
		return `${this.last}, ${this.first}`;
	}

	equals(other: PersonName): boolean {
		return this.first === other.first && this.last === other.last;
	}
}
