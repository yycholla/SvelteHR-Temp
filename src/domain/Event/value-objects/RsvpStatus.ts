import { Result } from '$domain/Result';
import { RsvpStatusValidationError } from '../errors/EventErrors';

export type RsvpStatusValue =
	| 'pending'
	| 'accepted'
	| 'declined'
	| 'tentative'
	| 'no_response'
	| 'waitlisted';

const VALID_STATUSES: ReadonlySet<RsvpStatusValue> = new Set([
	'pending',
	'accepted',
	'declined',
	'tentative',
	'no_response',
	'waitlisted'
]);

export class RsvpStatus {
	private constructor(private readonly _value: RsvpStatusValue) {}

	static create(status: string): Result<RsvpStatus, RsvpStatusValidationError> {
		// Normalize: trim, lowercase, convert kebab-case to snake_case
		const normalized = status.trim().toLowerCase().replace(/-/g, '_');

		if (normalized.length === 0) {
			return Result.error(new RsvpStatusValidationError('RSVP status cannot be empty'));
		}

		if (!VALID_STATUSES.has(normalized as RsvpStatusValue)) {
			return Result.error(
				new RsvpStatusValidationError(
					`Invalid status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		return Result.ok(new RsvpStatus(normalized as RsvpStatusValue));
	}

	get value(): RsvpStatusValue {
		return this._value;
	}

	equals(other: RsvpStatus): boolean {
		return this._value === other._value;
	}

	isPending(): boolean {
		return this._value === 'pending';
	}

	isAccepted(): boolean {
		return this._value === 'accepted';
	}

	isDeclined(): boolean {
		return this._value === 'declined';
	}

	isTentative(): boolean {
		return this._value === 'tentative';
	}

	isNoResponse(): boolean {
		return this._value === 'no_response';
	}

	isWaitlisted(): boolean {
		return this._value === 'waitlisted';
	}

	toString(): string {
		return this._value;
	}
}
