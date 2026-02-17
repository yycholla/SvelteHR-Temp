// src/domain/ActivityLog/value-objects/IpAddress.ts
import { Result } from '$domain/Result';
import { InvalidActivityLogError } from '../errors/ActivityLogErrors';

/** Maximum length for an IP address string (IPv6 can be up to 45 chars with zone ID) */
const MAX_IP_LENGTH = 45;

/**
 * Value object representing an IP address in an activity log entry.
 *
 * Supports IPv4 and IPv6 addresses.
 * - When provided, must be a non-empty string up to 45 characters.
 * - Can be null to represent an unknown or unavailable IP address.
 */
export class IpAddress {
	private constructor(private readonly _value: string) {}

	/**
	 * Create an IpAddress value object.
	 * @param value - IP address string (IPv4 or IPv6)
	 * @returns Result containing IpAddress or InvalidActivityLogError
	 */
	static create(value: string): Result<IpAddress, InvalidActivityLogError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidActivityLogError('IP address must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidActivityLogError('IP address cannot be empty'));
		}

		if (trimmed.length > MAX_IP_LENGTH) {
			return Result.error(
				new InvalidActivityLogError(
					`IP address cannot exceed ${MAX_IP_LENGTH} characters, got ${trimmed.length}`
				)
			);
		}

		return Result.ok(new IpAddress(trimmed));
	}

	/** The IP address string value */
	get value(): string {
		return this._value;
	}

	equals(other: IpAddress): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
