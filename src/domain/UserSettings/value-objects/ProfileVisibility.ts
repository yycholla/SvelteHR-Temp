// src/domain/UserSettings/value-objects/ProfileVisibility.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

type ProfileVisibilityValue = 'public' | 'team' | 'managers' | 'private';

const VALID_VISIBILITIES: ReadonlySet<string> = new Set([
	'public',
	'team',
	'managers',
	'private'
]);

/**
 * Visibility restriction order from most open to most restricted.
 * Higher index means more restricted.
 */
const RESTRICTION_ORDER: ReadonlyArray<ProfileVisibilityValue> = [
	'public',
	'team',
	'managers',
	'private'
];

/**
 * Value object representing the visibility level of a user's profile.
 *
 * Valid values: 'public', 'team', 'managers', 'private'
 * Restriction order: public < team < managers < private
 */
export class ProfileVisibility {
	private constructor(private readonly _value: ProfileVisibilityValue) {}

	/**
	 * Create a ProfileVisibility value object.
	 * @param value - Profile visibility level
	 * @returns Result containing ProfileVisibility or InvalidUserSettingsError
	 */
	static create(value: string): Result<ProfileVisibility, InvalidUserSettingsError> {
		if (!VALID_VISIBILITIES.has(value)) {
			return Result.error(
				new InvalidUserSettingsError(
					`Invalid profile visibility: "${value}". Must be one of: ${Array.from(VALID_VISIBILITIES).join(', ')}`
				)
			);
		}

		return Result.ok(new ProfileVisibility(value as ProfileVisibilityValue));
	}

	/** The profile visibility value */
	get value(): ProfileVisibilityValue {
		return this._value;
	}

	/**
	 * Returns true if this visibility setting is more restricted than the other.
	 * For example, 'private'.isRestrictedTo('team') returns true.
	 */
	isRestrictedTo(other: ProfileVisibility): boolean {
		const thisIndex = RESTRICTION_ORDER.indexOf(this._value);
		const otherIndex = RESTRICTION_ORDER.indexOf(other._value);
		return thisIndex > otherIndex;
	}

	equals(other: ProfileVisibility): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
