import { Result } from '$domain/Result';
import { InvalidTrainingError } from '../errors/TrainingErrors';

export type ContentTypeValue = 'text' | 'video' | 'quiz' | 'document' | 'interactive';

const VALID_CONTENT_TYPES: ReadonlySet<ContentTypeValue> = new Set([
	'text',
	'video',
	'quiz',
	'document',
	'interactive'
]);

export class ContentType {
	private constructor(private readonly _value: ContentTypeValue) {}

	static create(type: string): Result<ContentType, InvalidTrainingError> {
		const trimmed = type.trim();

		if (trimmed.length === 0) {
			return Result.error(
				new InvalidTrainingError(
					`Invalid content type: "${type}". Must be one of: ${Array.from(VALID_CONTENT_TYPES).join(', ')}`
				)
			);
		}

		if (!VALID_CONTENT_TYPES.has(trimmed as ContentTypeValue)) {
			return Result.error(
				new InvalidTrainingError(
					`Invalid content type: "${type}". Must be one of: ${Array.from(VALID_CONTENT_TYPES).join(', ')}`
				)
			);
		}

		return Result.ok(new ContentType(trimmed as ContentTypeValue));
	}

	get value(): ContentTypeValue {
		return this._value;
	}

	equals(other: ContentType): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
