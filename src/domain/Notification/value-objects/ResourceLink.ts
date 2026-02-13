import { Result } from '$domain/Result';
import { ResourceLinkValidationError } from '../errors/NotificationErrors';

const MAX_LENGTH = 500;
const URL_PATTERN = /^https?:\/\/.+/i;

export class ResourceLink {
	private constructor(private readonly _value: string) {}

	static create(url: string): Result<ResourceLink, ResourceLinkValidationError> {
		const trimmed = url.trim();

		// Reject whitespace-only strings (after trimming becomes empty)
		// But allow explicitly empty string (url === '')
		if (trimmed.length === 0 && url.length > 0) {
			return Result.error(
				new ResourceLinkValidationError('Invalid resource link: URL cannot be whitespace only')
			);
		}

		// Allow empty string (optional link)
		if (trimmed.length === 0) {
			return Result.ok(new ResourceLink(''));
		}

		// Validate URL format
		if (!URL_PATTERN.test(trimmed)) {
			return Result.error(
				new ResourceLinkValidationError(
					'Invalid resource link: URL must start with http:// or https://'
				)
			);
		}

		// Validate max length
		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new ResourceLinkValidationError(
					`Invalid resource link: URL cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new ResourceLink(trimmed));
	}

	equals(other: ResourceLink): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}

	get url(): string {
		return this._value;
	}

	get value(): string {
		return this._value;
	}
}
