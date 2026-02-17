import { Result } from '$domain/Result';
import { InvalidOnboardingModuleError } from '../errors/OnboardingErrors';

export type ModuleCategoryValue =
	| 'company_wide'
	| 'department_specific'
	| 'role_specific'
	| 'compliance'
	| 'orientation'
	| 'technical';

const VALID_CATEGORIES: ReadonlySet<ModuleCategoryValue> = new Set([
	'company_wide',
	'department_specific',
	'role_specific',
	'compliance',
	'orientation',
	'technical'
]);

export class ModuleCategory {
	private constructor(private readonly _value: ModuleCategoryValue) {}

	static create(category: string): Result<ModuleCategory, InvalidOnboardingModuleError> {
		const trimmed = category.trim();

		if (trimmed.length === 0) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Invalid module category: "${category}". Must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}`
				)
			);
		}

		if (!VALID_CATEGORIES.has(trimmed as ModuleCategoryValue)) {
			return Result.error(
				new InvalidOnboardingModuleError(
					`Invalid module category: "${category}". Must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}`
				)
			);
		}

		return Result.ok(new ModuleCategory(trimmed as ModuleCategoryValue));
	}

	get value(): ModuleCategoryValue {
		return this._value;
	}

	equals(other: ModuleCategory): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
