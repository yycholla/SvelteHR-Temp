import { Result } from '$domain/Result';
import { InvalidTrainingError } from '../errors/TrainingErrors';

const MAX_LENGTH = 200;
const MIN_LENGTH = 1;

export class TrainingTitle {
	private constructor(private readonly _value: string) {}

	static create(title: string): Result<TrainingTitle, InvalidTrainingError> {
		const trimmed = title.trim();

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new InvalidTrainingError('Invalid training title: title cannot be empty')
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidTrainingError(
					`Invalid training title: title cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new TrainingTitle(trimmed));
	}

	get value(): string {
		return this._value;
	}

	equals(other: TrainingTitle): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
