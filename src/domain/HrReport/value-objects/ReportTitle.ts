import { Result } from '$domain/Result';
import { InvalidHrReportError } from '../errors/HrReportErrors';

const MAX_LENGTH = 200;

/**
 * Value object representing the title of an HR report.
 *
 * Rules:
 * - Must be 1-200 characters
 * - Trimmed before validation
 * - Cannot be empty after trimming
 */
export class ReportTitle {
	private constructor(private readonly _value: string) {}

	static create(title: string): Result<ReportTitle, InvalidHrReportError> {
		if (typeof title !== 'string') {
			return Result.error(
				new InvalidHrReportError(`Invalid report title: must be a string`)
			);
		}

		const trimmed = title.trim();

		if (trimmed.length === 0) {
			return Result.error(
				new InvalidHrReportError('Invalid report title: title cannot be empty')
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidHrReportError(
					`Invalid report title: title must be at most ${MAX_LENGTH} characters, got ${trimmed.length}`
				)
			);
		}

		return Result.ok(new ReportTitle(trimmed));
	}

	get value(): string {
		return this._value;
	}

	equals(other: ReportTitle): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
