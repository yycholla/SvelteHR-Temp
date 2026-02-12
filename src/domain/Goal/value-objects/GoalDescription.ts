// src/domain/Goal/value-objects/GoalDescription.ts
import { Result } from '$domain/Result';
import { GoalDescriptionValidationError } from '../errors/GoalErrors';

const MAX_LENGTH = 2000;

interface GoalDescriptionProps {
	value: string;
}

export class GoalDescription {
	private constructor(private readonly props: GoalDescriptionProps) {}

	static create(description: string): Result<GoalDescription, GoalDescriptionValidationError> {
		const trimmed = description.trim();

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new GoalDescriptionValidationError(
					`Goal description cannot exceed ${MAX_LENGTH} characters`
				)
			);
		}

		return Result.ok(new GoalDescription({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	get length(): number {
		return this.props.value.length;
	}

	isEmpty(): boolean {
		return this.props.value.length === 0;
	}

	equals(other: GoalDescription): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
