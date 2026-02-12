// src/domain/Goal/value-objects/Progress.ts
import { Result } from '$domain/Result';
import { ProgressValidationError } from '../errors/GoalErrors';

const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;

interface ProgressProps {
	value: number;
}

export class Progress {
	private constructor(private readonly props: ProgressProps) {}

	static create(progress: number): Result<Progress, ProgressValidationError> {
		if (!Number.isFinite(progress)) {
			return Result.error(new ProgressValidationError('Progress must be a valid number'));
		}

		if (progress < MIN_PROGRESS) {
			return Result.error(
				new ProgressValidationError(`Progress cannot be less than ${MIN_PROGRESS}%`)
			);
		}

		if (progress > MAX_PROGRESS) {
			return Result.error(new ProgressValidationError(`Progress cannot exceed ${MAX_PROGRESS}%`));
		}

		return Result.ok(new Progress({ value: Math.round(progress) }));
	}

	static zero(): Progress {
		return new Progress({ value: 0 });
	}

	static complete(): Progress {
		return new Progress({ value: 100 });
	}

	get value(): number {
		return this.props.value;
	}

	isZero(): boolean {
		return this.props.value === 0;
	}

	isComplete(): boolean {
		return this.props.value === 100;
	}

	isPartial(): boolean {
		return this.props.value > 0 && this.props.value < 100;
	}

	increment(amount: number): Result<Progress, ProgressValidationError> {
		return Progress.create(this.props.value + amount);
	}

	decrement(amount: number): Result<Progress, ProgressValidationError> {
		return Progress.create(this.props.value - amount);
	}

	setTo(newProgress: number): Result<Progress, ProgressValidationError> {
		return Progress.create(newProgress);
	}

	formatPercentage(): string {
		return `${this.props.value}%`;
	}

	equals(other: Progress): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value.toString();
	}
}
