import { Result } from '$domain/Result';
import { EventStatusValidationError } from '../errors/EventErrors';

export type EventStatusValue = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';

const VALID_STATUSES: ReadonlySet<EventStatusValue> = new Set([
	'scheduled',
	'ongoing',
	'completed',
	'cancelled',
	'postponed'
]);

const TERMINAL_STATUSES: ReadonlySet<EventStatusValue> = new Set(['completed', 'cancelled']);

/**
 * Defines valid status transitions.
 * Key: current status
 * Value: set of allowed next statuses
 */
const VALID_TRANSITIONS: ReadonlyMap<EventStatusValue, ReadonlySet<EventStatusValue>> = new Map([
	['scheduled', new Set<EventStatusValue>(['scheduled', 'ongoing', 'cancelled', 'postponed'])],
	['ongoing', new Set<EventStatusValue>(['ongoing', 'completed', 'cancelled'])],
	['completed', new Set<EventStatusValue>(['completed'])], // Terminal state
	['cancelled', new Set<EventStatusValue>(['cancelled'])], // Terminal state
	['postponed', new Set<EventStatusValue>(['postponed', 'scheduled', 'cancelled'])]
]);

export class EventStatus {
	private constructor(private readonly _value: EventStatusValue) {}

	static create(status: string): Result<EventStatus, EventStatusValidationError> {
		const normalized = status.trim().toLowerCase();

		if (normalized.length === 0) {
			return Result.error(new EventStatusValidationError('Event status cannot be empty'));
		}

		if (!VALID_STATUSES.has(normalized as EventStatusValue)) {
			return Result.error(
				new EventStatusValidationError(
					`Invalid status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		return Result.ok(new EventStatus(normalized as EventStatusValue));
	}

	get value(): EventStatusValue {
		return this._value;
	}

	equals(other: EventStatus): boolean {
		return this._value === other._value;
	}

	isScheduled(): boolean {
		return this._value === 'scheduled';
	}

	isOngoing(): boolean {
		return this._value === 'ongoing';
	}

	isCompleted(): boolean {
		return this._value === 'completed';
	}

	isCancelled(): boolean {
		return this._value === 'cancelled';
	}

	isPostponed(): boolean {
		return this._value === 'postponed';
	}

	isTerminal(): boolean {
		return TERMINAL_STATUSES.has(this._value);
	}

	canTransitionTo(targetStatus: EventStatusValue): boolean {
		const allowedTransitions = VALID_TRANSITIONS.get(this._value);
		return allowedTransitions ? allowedTransitions.has(targetStatus) : false;
	}

	toString(): string {
		return this._value;
	}
}
