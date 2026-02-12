// src/domain/Goal/value-objects/GoalTitle.ts
import { Result } from '$domain/Result';
import { GoalTitleValidationError } from '../errors/GoalErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 200;

interface GoalTitleProps {
	value: string;
}

export class GoalTitle {
	private constructor(private readonly props: GoalTitleProps) {}

	static create(title: string): Result<GoalTitle, GoalTitleValidationError> {
		const trimmed = title.trim();

		if (!trimmed) {
			return Result.error(new GoalTitleValidationError('Goal title cannot be empty'));
		}

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new GoalTitleValidationError(
					`Goal title must be at least ${MIN_LENGTH} character${MIN_LENGTH > 1 ? 's' : ''}`
				)
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new GoalTitleValidationError(`Goal title cannot exceed ${MAX_LENGTH} characters`)
			);
		}

		return Result.ok(new GoalTitle({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	get length(): number {
		return this.props.value.length;
	}

	equals(other: GoalTitle): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
