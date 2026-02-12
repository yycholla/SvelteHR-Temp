// src/domain/Goal/value-objects/GoalStatus.ts
import { Result } from '$domain/Result';
import { GoalStatusValidationError } from '../errors/GoalErrors';

type GoalStatusValue = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

const VALID_STATUSES = ['not_started', 'in_progress', 'completed', 'cancelled'] as const;

interface GoalStatusProps {
	value: GoalStatusValue;
}

export class GoalStatus {
	private constructor(private readonly props: GoalStatusProps) {}

	static create(status: string): Result<GoalStatus, GoalStatusValidationError> {
		const trimmed = status.trim();
		if (!trimmed) {
			return Result.error(new GoalStatusValidationError('Goal status cannot be empty'));
		}

		const normalized = trimmed.toLowerCase().replace(/-/g, '_');
		if (!(VALID_STATUSES as readonly string[]).includes(normalized)) {
			return Result.error(
				new GoalStatusValidationError(
					`Invalid goal status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`
				)
			);
		}

		return Result.ok(new GoalStatus({ value: normalized as GoalStatusValue }));
	}

	get value(): GoalStatusValue {
		return this.props.value;
	}

	// Status checks
	isNotStarted(): boolean {
		return this.props.value === 'not_started';
	}

	isInProgress(): boolean {
		return this.props.value === 'in_progress';
	}

	isCompleted(): boolean {
		return this.props.value === 'completed';
	}

	isCancelled(): boolean {
		return this.props.value === 'cancelled';
	}

	isActive(): boolean {
		return this.props.value === 'in_progress';
	}

	isTerminal(): boolean {
		return this.props.value === 'completed' || this.props.value === 'cancelled';
	}

	// State transition validation
	canTransitionTo(newStatus: GoalStatus): boolean {
		const current = this.props.value;
		const next = newStatus.props.value;

		const validTransitions: Record<GoalStatusValue, GoalStatusValue[]> = {
			not_started: ['in_progress', 'cancelled'],
			in_progress: ['completed', 'cancelled', 'not_started'],
			completed: [],
			cancelled: ['not_started', 'in_progress']
		};

		return validTransitions[current].includes(next);
	}

	equals(other: GoalStatus): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
