import { Result } from '$domain/Result';
import { EventColorValidationError } from '../errors/EventErrors';

export class EventColor {
	private constructor(private readonly _value: string) {}

	static create(color: string): Result<EventColor, EventColorValidationError> {
		let normalized = color.trim();

		// Add # prefix if missing
		if (!normalized.startsWith('#')) {
			normalized = '#' + normalized;
		}

		// Validate hex format: #RGB or #RRGGBB
		const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
		if (!hexPattern.test(normalized)) {
			return Result.error(
				new EventColorValidationError(
					'Invalid color format. Expected 3-digit (#RGB) or 6-digit (#RRGGBB) hex color'
				)
			);
		}

		// Expand 3-digit to 6-digit
		if (normalized.length === 4) {
			const [, r, g, b] = normalized;
			normalized = `#${r}${r}${g}${g}${b}${b}`;
		}

		// Normalize to uppercase
		normalized = normalized.toUpperCase();

		return Result.ok(new EventColor(normalized));
	}

	get value(): string {
		return this._value;
	}

	equals(other: EventColor): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
