import { Result } from '$domain/Result';
import { DocumentTitleValidationError } from '../errors/DocumentErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 200;

export class DocumentTitle {
	private constructor(private readonly _value: string) {}

	static create(title: string): Result<DocumentTitle, DocumentTitleValidationError> {
		const trimmed = title.trim();

		if (trimmed.length === 0) {
			return Result.error(new DocumentTitleValidationError('Document title cannot be empty'));
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new DocumentTitleValidationError(
					`Document title cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new DocumentTitle(trimmed));
	}

	get value(): string {
		return this._value;
	}

	equals(other: DocumentTitle): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
