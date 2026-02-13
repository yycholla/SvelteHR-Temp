import { Result } from '$domain/Result';
import { FileSizeValidationError } from '../errors/DocumentErrors';

const MAX_FILE_SIZE = 52428800; // 50MB in bytes

export class FileSize {
	private constructor(private readonly _bytes: number) {}

	static create(bytes: number): Result<FileSize, FileSizeValidationError> {
		if (bytes < 0) {
			return Result.error(new FileSizeValidationError('File size must be non-negative'));
		}

		if (bytes > MAX_FILE_SIZE) {
			return Result.error(new FileSizeValidationError(`File size exceeds ${MAX_FILE_SIZE} bytes`));
		}

		return Result.ok(new FileSize(bytes));
	}

	get bytes(): number {
		return this._bytes;
	}

	get kilobytes(): number {
		return this._bytes / 1024;
	}

	get megabytes(): number {
		return this._bytes / 1048576;
	}

	equals(other: FileSize): boolean {
		return this._bytes === other._bytes;
	}

	humanReadable(): string {
		if (this._bytes < 1024) {
			return `${this._bytes} B`;
		}

		if (this._bytes < 1048576) {
			return `${(this._bytes / 1024).toFixed(2)} KB`;
		}

		return `${(this._bytes / 1048576).toFixed(2)} MB`;
	}
}
