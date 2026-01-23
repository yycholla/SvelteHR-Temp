// src/domain/Employee/Email.ts
import { Result } from '$domain/Result';
import { InvalidEmailError } from '$domain/errors';

export class Email {
	private constructor(public readonly value: string) {}

	static create(email: string): Result<Email, InvalidEmailError> {
		if (!email || email.trim().length === 0) {
			return Result.error(new InvalidEmailError('Email cannot be empty'));
		}

		// RFC 5322 compliant regex (simplified)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const normalizedEmail = email.toLowerCase().trim();

		if (!emailRegex.test(normalizedEmail)) {
			return Result.error(new InvalidEmailError(`Invalid email format: ${email}`));
		}

		return Result.ok(new Email(normalizedEmail));
	}

	equals(other: Email): boolean {
		return this.value === other.value;
	}
}
