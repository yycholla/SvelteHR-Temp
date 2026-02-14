import { Result } from '$domain/Result';
import { MimeTypeValidationError } from '../errors/DocumentErrors';

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
	// Documents
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',

	// Images
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',

	// Text
	'text/plain',
	'text/csv',
	'text/html',
	'text/css',
	'text/javascript',

	// Archives
	'application/zip',
	'application/x-rar-compressed',
	'application/x-7z-compressed',

	// Data
	'application/json',
	'application/xml',
	'text/xml'
]);

const BLOCKED_MIME_TYPES: ReadonlySet<string> = new Set([
	'application/x-executable',
	'application/x-sharedlib',
	'application/x-msdownload',
	'application/x-sh',
	'application/x-bat',
	'application/x-mach-binary',
	'application/x-dosexec',
	'application/vnd.microsoft.portable-executable'
]);

const MIME_TO_EXTENSION: ReadonlyMap<string, string> = new Map([
	['application/pdf', '.pdf'],
	['image/jpeg', '.jpg'],
	['image/png', '.png'],
	['image/gif', '.gif'],
	['image/webp', '.webp'],
	['text/plain', '.txt'],
	['text/csv', '.csv'],
	['application/json', '.json'],
	['application/zip', '.zip'],
	['application/msword', '.doc'],
	['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
	['application/vnd.ms-excel', '.xls'],
	['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx']
]);

export class MimeType {
	private constructor(private readonly _value: string) {}

	static create(mimeType: string): Result<MimeType, MimeTypeValidationError> {
		const normalized = mimeType.trim().toLowerCase();

		// Check empty
		if (normalized.length === 0) {
			return Result.error(new MimeTypeValidationError('MIME type cannot be empty'));
		}

		// Check blocked types first (security)
		if (BLOCKED_MIME_TYPES.has(normalized)) {
			return Result.error(
				new MimeTypeValidationError(`Blocked MIME type for security reasons: ${mimeType}`)
			);
		}

		// Check format (must have type/subtype)
		if (!this.isValidFormat(normalized)) {
			return Result.error(new MimeTypeValidationError(`Invalid MIME type format: ${mimeType}`));
		}

		// Check if allowed
		if (!ALLOWED_MIME_TYPES.has(normalized)) {
			return Result.error(new MimeTypeValidationError(`Unsupported MIME type: ${mimeType}`));
		}

		return Result.ok(new MimeType(normalized));
	}

	private static isValidFormat(mimeType: string): boolean {
		const parts = mimeType.split('/');
		if (parts.length !== 2) {
			return false;
		}
		const [type, subtype] = parts;
		return type.length > 0 && subtype.length > 0;
	}

	get value(): string {
		return this._value;
	}

	isDocument(): boolean {
		return (
			this._value === 'application/pdf' ||
			this._value === 'application/msword' ||
			this._value.includes('openxmlformats-officedocument')
		);
	}

	isImage(): boolean {
		return this._value.startsWith('image/');
	}

	isText(): boolean {
		return this._value.startsWith('text/');
	}

	getCommonExtension(): string {
		return MIME_TO_EXTENSION.get(this._value) || '';
	}

	equals(other: MimeType): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
