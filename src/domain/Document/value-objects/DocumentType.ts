import { Result } from '$domain/Result';
import { DocumentTypeValidationError } from '../errors/DocumentErrors';

export type DocumentTypeValue = 'policy' | 'handbook' | 'form' | 'template' | 'contract';

const VALID_TYPES: ReadonlySet<DocumentTypeValue> = new Set([
	'policy',
	'handbook',
	'form',
	'template',
	'contract'
]);

export class DocumentType {
	private constructor(private readonly _value: DocumentTypeValue) {}

	static create(type: string): Result<DocumentType, DocumentTypeValidationError> {
		// Normalize: trim, lowercase, remove hyphens
		const normalized = type.trim().toLowerCase().replace(/-/g, '');

		if (normalized.length === 0) {
			return Result.error(new DocumentTypeValidationError('Document type cannot be empty'));
		}

		if (!VALID_TYPES.has(normalized as DocumentTypeValue)) {
			return Result.error(
				new DocumentTypeValidationError(
					`Invalid type: "${type}". Must be one of: ${Array.from(VALID_TYPES).join(', ')}`
				)
			);
		}

		return Result.ok(new DocumentType(normalized as DocumentTypeValue));
	}

	get value(): DocumentTypeValue {
		return this._value;
	}

	equals(other: DocumentType): boolean {
		return this._value === other._value;
	}

	isPolicy(): boolean {
		return this._value === 'policy';
	}

	isHandbook(): boolean {
		return this._value === 'handbook';
	}

	isForm(): boolean {
		return this._value === 'form';
	}

	isTemplate(): boolean {
		return this._value === 'template';
	}

	isContract(): boolean {
		return this._value === 'contract';
	}

	toString(): string {
		return this._value;
	}
}
