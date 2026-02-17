import { Result } from '$domain/Result';
import { InvalidOnboardingModuleError } from '../errors/OnboardingErrors';

const MAX_LENGTH = 200;
const MIN_LENGTH = 1;

export class ModuleTitle {
	private constructor(private readonly _value: string) {}

	static create(title: string): Result<ModuleTitle, InvalidOnboardingModuleError> {
		const trimmed = title.trim();

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new InvalidOnboardingModuleError('Invalid module title: title cannot be empty')
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Invalid module title: title cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new ModuleTitle(trimmed));
	}

	get value(): string {
		return this._value;
	}

	equals(other: ModuleTitle): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
