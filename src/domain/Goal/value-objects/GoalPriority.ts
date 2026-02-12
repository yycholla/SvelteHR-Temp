// src/domain/Goal/value-objects/GoalPriority.ts
import { Result } from '$domain/Result';
import { GoalPriorityValidationError } from '../errors/GoalErrors';

type GoalPriorityValue = 'low' | 'medium' | 'high';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

const PRIORITY_LEVELS: Record<GoalPriorityValue, number> = {
	low: 1,
	medium: 2,
	high: 3
};

interface GoalPriorityProps {
	value: GoalPriorityValue;
}

export class GoalPriority {
	private constructor(private readonly props: GoalPriorityProps) {}

	static create(priority: string): Result<GoalPriority, GoalPriorityValidationError> {
		const trimmed = priority.trim();
		if (!trimmed) {
			return Result.error(new GoalPriorityValidationError('Goal priority cannot be empty'));
		}

		const normalized = trimmed.toLowerCase();
		if (!(VALID_PRIORITIES as readonly string[]).includes(normalized)) {
			return Result.error(
				new GoalPriorityValidationError(
					`Invalid goal priority: ${priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}`
				)
			);
		}

		return Result.ok(new GoalPriority({ value: normalized as GoalPriorityValue }));
	}

	get value(): GoalPriorityValue {
		return this.props.value;
	}

	get level(): number {
		return PRIORITY_LEVELS[this.props.value];
	}

	isLow(): boolean {
		return this.props.value === 'low';
	}

	isMedium(): boolean {
		return this.props.value === 'medium';
	}

	isHigh(): boolean {
		return this.props.value === 'high';
	}

	isHigherThan(other: GoalPriority): boolean {
		return this.level > other.level;
	}

	isLowerThan(other: GoalPriority): boolean {
		return this.level < other.level;
	}

	equals(other: GoalPriority): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
