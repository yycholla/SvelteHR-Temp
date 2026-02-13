import { Result } from '$domain/Result';
import { DocumentStatusValidationError } from '../errors/DocumentErrors';

export type DocumentStatusValue = 'draft' | 'published' | 'archived' | 'deleted';

const VALID_STATUSES: ReadonlySet<DocumentStatusValue> = new Set([
	'draft',
	'published',
	'archived',
	'deleted'
]);

export class DocumentStatus {
	private constructor(private readonly _value: DocumentStatusValue) {}

	static create(status: string): Result<DocumentStatus, DocumentStatusValidationError> {
		const normalized = status.trim().toLowerCase();

		if (normalized.length === 0) {
			return Result.error(new DocumentStatusValidationError('Document status cannot be empty'));
		}

		if (!VALID_STATUSES.has(normalized as DocumentStatusValue)) {
			return Result.error(
				new DocumentStatusValidationError(
					`Invalid status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		return Result.ok(new DocumentStatus(normalized as DocumentStatusValue));
	}

	get value(): DocumentStatusValue {
		return this._value;
	}

	equals(other: DocumentStatus): boolean {
		return this._value === other._value;
	}

	isDraft(): boolean {
		return this._value === 'draft';
	}

	isPublished(): boolean {
		return this._value === 'published';
	}

	isArchived(): boolean {
		return this._value === 'archived';
	}

	isDeleted(): boolean {
		return this._value === 'deleted';
	}

	toString(): string {
		return this._value;
	}
}
